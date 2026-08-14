'use server'

import { revalidatePath }           from 'next/cache'
import { redirect }                 from 'next/navigation'
import { sql }                      from '@/lib/db'
import { normalizarCelular }        from '@/lib/phone'
import { generarTokenVoluntario }   from '@/lib/tokens'
import { liberarCuposNoConfirmados } from '@/lib/liberar'

// ── Helper: verifica que el shift pertenezca al centro de este token ──────────

async function verificarAcceso(
  token: string,
  shiftId: string,
): Promise<{ center_slug: string } | null> {
  const rows = await sql<{ center_slug: string }[]>`
    SELECT c.slug AS center_slug
    FROM shifts sh
    JOIN centers c ON c.id = sh.center_id
    WHERE sh.id = ${shiftId}
      AND c.admin_token = ${token}
      AND c.is_active   = true
    LIMIT 1
  `
  return rows[0] ?? null
}

// ── 1. Marcar asistencia ──────────────────────────────────────────────────────
// Idempotente: si ya es 'asistio', el UPDATE no toca checked_in_at.

export async function marcarAsistencia(
  token: string,
  signupId: string,
  _formData: FormData,
): Promise<void> {
  // Obtener shift_id y verificar que pertenece al centro del admin
  const rows = await sql<{ shift_id: string; center_slug: string }[]>`
    SELECT sg.shift_id, c.slug AS center_slug
    FROM signups sg
    JOIN shifts  sh ON sh.id = sg.shift_id
    JOIN centers c  ON c.id  = sh.center_id
    WHERE sg.id       = ${signupId}
      AND c.admin_token = ${token}
      AND c.is_active   = true
    LIMIT 1
  `
  if (rows.length === 0) redirect('/')

  const { shift_id, center_slug } = rows[0]

  await sql`
    UPDATE signups
    SET state          = 'asistio',
        checked_in_at  = now(),
        checkin_method = 'manual'
    WHERE id    = ${signupId}
      AND state NOT IN ('asistio', 'cancelado')
  `

  revalidatePath('/panel/' + token + '/turno/' + shift_id)
  revalidatePath('/panel/' + token)
  revalidatePath('/c/' + center_slug)
  redirect('/panel/' + token + '/turno/' + shift_id)
}

// ── 2. Agregar walk-in ────────────────────────────────────────────────────────
// NO toca `taken`. El walk-in no ocupa cupo; `taken` cuenta reservas online.
// ON CONFLICT: si la persona ya tenía fila (inscripción previa o cancelada),
// la actualiza a 'asistio' y deja is_walk_in=false (no es walk-in, era un
// inscrito que volvió).

export async function agregarWalkIn(
  token: string,
  shiftId: string,
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const acceso = await verificarAcceso(token, shiftId)
  if (!acceso) return { error: 'Acceso denegado.' }

  const nombre    = (formData.get('nombre')  as string ?? '').trim()
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

  revalidatePath('/panel/' + token + '/turno/' + shiftId)
  revalidatePath('/panel/' + token)
  revalidatePath('/c/' + acceso.center_slug)
  redirect('/panel/' + token + '/turno/' + shiftId)
}

// ── 3. Liberar no confirmados ahora ──────────────────────────────────────────
// Respaldo manual del cron. Devuelve stats; el cliente hace router.refresh().
// lib/liberar.ts ya llama revalidatePath('/c/slug') internamente.

export async function liberarAhora(
  token: string,
  shiftId: string,
): Promise<{ liberados: number; turnos: number } | null> {
  const acceso = await verificarAcceso(token, shiftId)
  if (!acceso) return null

  const stats = await liberarCuposNoConfirmados(shiftId)

  revalidatePath('/panel/' + token + '/turno/' + shiftId)
  revalidatePath('/panel/' + token)

  return stats
}
