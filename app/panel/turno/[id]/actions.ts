'use server'

import { revalidatePath }            from 'next/cache'
import { redirect }                  from 'next/navigation'
import { sql }                       from '@/lib/db'
import { requiereSesion }            from '@/lib/auth'
import { normalizarCelular }         from '@/lib/phone'
import { generarTokenVoluntario }    from '@/lib/tokens'
import { liberarCuposNoConfirmados, liberarAusentes, contarAusentes } from '@/lib/liberar'

async function verificarAcceso(
  shiftId: string,
): Promise<{ center_slug: string } | null> {
  const sesion = await requiereSesion()
  const rows = await sql<{ center_slug: string }[]>`
    SELECT c.slug AS center_slug
    FROM shifts sh
    JOIN centers c ON c.id = sh.center_id
    WHERE sh.id          = ${shiftId}
      AND sh.center_id   = ${sesion.user.centerId}
    LIMIT 1
  `
  return rows[0] ?? null
}

// ── 1. Marcar asistencia ──────────────────────────────────────────────────────

export async function marcarAsistencia(
  signupId: string,
  _formData: FormData,
): Promise<void> {
  const sesion = await requiereSesion()
  const rows = await sql<{ shift_id: string; center_slug: string }[]>`
    SELECT sg.shift_id, c.slug AS center_slug
    FROM signups sg
    JOIN shifts  sh ON sh.id = sg.shift_id
    JOIN centers c  ON c.id  = sh.center_id
    WHERE sg.id          = ${signupId}
      AND sh.center_id   = ${sesion.user.centerId}
    LIMIT 1
  `
  if (rows.length === 0) redirect('/panel')

  const { shift_id, center_slug } = rows[0]

  await sql`
    UPDATE signups
    SET state         = 'asistio',
        checked_in_at  = now(),
        checkin_method = 'manual'
    WHERE id    = ${signupId}
      AND state NOT IN ('asistio', 'cancelado')
  `

  revalidatePath('/panel/turno/' + shift_id)
  revalidatePath('/panel')
  revalidatePath('/c/' + center_slug)
  redirect('/panel/turno/' + shift_id)
}

// ── 2. Agregar walk-in ────────────────────────────────────────────────────────

export async function agregarWalkIn(
  shiftId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const acceso = await verificarAcceso(shiftId)
  if (!acceso) return { error: 'Acceso denegado.' }

  const nombre     = (formData.get('nombre')  as string ?? '').trim()
  const celularRaw = (formData.get('celular') as string ?? '').trim()

  if (!nombre || nombre.length < 2) {
    return { error: 'Escribe el nombre completo (mínimo 2 caracteres).' }
  }

  const celularResult = normalizarCelular(celularRaw)
  if (!celularResult.ok) return { error: celularResult.error }
  const phone = celularResult.valor

  const manageToken = generarTokenVoluntario()

  await sql.begin(async (tx) => {
    // Lock the signup row (if any) to serialize concurrent same-phone walk-ins
    const [prev] = await tx<{ state: string }[]>`
      SELECT state FROM signups
      WHERE shift_id = ${shiftId} AND phone = ${phone}
      FOR UPDATE
      LIMIT 1
    `

    // Increment taken only when this signup is genuinely new-to-taken:
    //   null       → brand-new signup, never counted
    //   'cancelado'→ was decremented on cancel
    //   'liberado' → was decremented on liberation
    //   'inscrito' / 'confirmado' / 'asistio' → already counted, skip increment
    const prevState = prev?.state
    if (!prevState || prevState === 'cancelado' || prevState === 'liberado') {
      await tx`UPDATE shifts SET taken = taken + 1 WHERE id = ${shiftId}`
    }

    await tx`
      INSERT INTO signups
        (shift_id, phone, name, state, manage_token, is_walk_in, checked_in_at, checkin_method)
      VALUES
        (${shiftId}, ${phone}, ${nombre}, 'asistio', ${manageToken}, true, now(), 'manual')
      ON CONFLICT (shift_id, phone) DO UPDATE
        SET state          = 'asistio',
            checked_in_at  = now(),
            checkin_method = 'manual',
            name           = EXCLUDED.name,
            is_walk_in     = false
    `
  })

  revalidatePath('/panel/turno/' + shiftId)
  revalidatePath('/panel')
  revalidatePath('/c/' + acceso.center_slug)
  redirect('/panel/turno/' + shiftId)
}

// ── 3. Quitar walk-in ─────────────────────────────────────────────────────────

export async function quitarWalkIn(signupId: string): Promise<void> {
  const sesion = await requiereSesion()

  const rows = await sql<{ shift_id: string; center_slug: string }[]>`
    SELECT sg.shift_id, c.slug AS center_slug
    FROM signups sg
    JOIN shifts  sh ON sh.id = sg.shift_id
    JOIN centers c  ON c.id  = sh.center_id
    WHERE sg.id          = ${signupId}
      AND sh.center_id   = ${sesion.user.centerId}
    LIMIT 1
  `
  if (rows.length === 0) return

  const { shift_id, center_slug } = rows[0]

  await sql.begin(async (tx) => {
    // Idempotent: only cancels if currently active (asistio + is_walk_in)
    // Second call finds state='cancelado' → no update → taken not touched twice
    const [updated] = await tx<{ id: string }[]>`
      UPDATE signups
      SET state = 'cancelado', cancelled_at = now()
      WHERE id         = ${signupId}
        AND is_walk_in = true
        AND state      = 'asistio'
      RETURNING id
    `
    if (updated) {
      await tx`UPDATE shifts SET taken = GREATEST(taken - 1, 0) WHERE id = ${shift_id}`
    }
  })

  revalidatePath('/panel/turno/' + shift_id)
  revalidatePath('/panel')
  revalidatePath('/c/' + center_slug)
}

// ── 3. Liberar cupos de ausentes ─────────────────────────────────────────────

export async function contarAusentesAhora(shiftId: string): Promise<number> {
  const acceso = await verificarAcceso(shiftId)
  if (!acceso) return 0
  return contarAusentes(shiftId)
}

export async function liberarAusentesAhora(
  shiftId: string,
): Promise<{ liberados: number; turnos: number } | null> {
  const acceso = await verificarAcceso(shiftId)
  if (!acceso) return null

  const stats = await liberarAusentes(shiftId)

  revalidatePath('/panel/turno/' + shiftId)
  revalidatePath('/panel')

  return stats
}

// Conservado para el cron (state='inscrito', siempre retorna 0 con el modelo actual)
export async function liberarAhora(
  shiftId: string,
): Promise<{ liberados: number; turnos: number } | null> {
  const acceso = await verificarAcceso(shiftId)
  if (!acceso) return null

  const stats = await liberarCuposNoConfirmados(shiftId)

  revalidatePath('/panel/turno/' + shiftId)
  revalidatePath('/panel')

  return stats
}
