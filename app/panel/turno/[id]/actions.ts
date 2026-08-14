'use server'

import { revalidatePath }            from 'next/cache'
import { redirect }                  from 'next/navigation'
import { sql }                       from '@/lib/db'
import { requiereSesion }            from '@/lib/auth'
import { normalizarCelular }         from '@/lib/phone'
import { generarTokenVoluntario }    from '@/lib/tokens'
import { liberarCuposNoConfirmados } from '@/lib/liberar'

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

  await sql`
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

  revalidatePath('/panel/turno/' + shiftId)
  revalidatePath('/panel')
  revalidatePath('/c/' + acceso.center_slug)
  redirect('/panel/turno/' + shiftId)
}

// ── 3. Liberar no confirmados ahora ──────────────────────────────────────────

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
