'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { normalizarCelular } from '@/lib/phone'
import { generarTokenVoluntario } from '@/lib/tokens'

export type ActionState = { error: string } | null

export async function inscribir(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const slug    = formData.get('slug')     as string
  const shiftId = formData.get('shift_id') as string

  // Honeypot — bots fill it, humans don't see it
  if (formData.get('website')) {
    redirect(`/c/${slug}/turno/${shiftId}/listo`)
  }

  // Validate nombre
  const nombre = (formData.get('nombre') as string ?? '').trim()
  if (!nombre || nombre.length < 2) {
    return { error: 'Por favor escribe tu nombre completo.' }
  }

  // Validate phone
  const celularRaw   = (formData.get('celular') as string ?? '').trim()
  const celularResult = normalizarCelular(celularRaw)
  if (!celularResult.ok) {
    return { error: celularResult.error }
  }
  const phone = celularResult.valor

  // Check ≤ 3 active future signups for this phone
  const [activeCount] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM signups sg
    JOIN shifts sh ON sh.id = sg.shift_id
    WHERE sg.phone = ${phone}
      AND sg.state IN ('inscrito', 'confirmado')
      AND sh.ends_at > now()
  `
  if (activeCount.count >= 3) {
    return { error: 'Ya tienes 3 turnos activos. Cancela uno antes de inscribirte en otro.' }
  }

  const token = generarTokenVoluntario()

  try {
    await sql.begin(async (tx) => {
      // Atomic capacity check + increment
      const shifted = await tx<{ taken: number }[]>`
        UPDATE shifts
        SET taken = taken + 1
        WHERE id = ${shiftId}
          AND taken < capacity + floor(capacity * overbook_pct / 100.0)
        RETURNING taken
      `
      if (shifted.length === 0) throw new Error('LLENO')

      // Upsert signup — only re-inscribes if previous state is cancelado/liberado
      const inserted = await tx<{ id: string }[]>`
        INSERT INTO signups (shift_id, phone, name, state, manage_token)
        VALUES (${shiftId}, ${phone}, ${nombre}, 'inscrito', ${token})
        ON CONFLICT (shift_id, phone) DO UPDATE
          SET name         = EXCLUDED.name,
              state        = 'inscrito',
              manage_token = ${token}
          WHERE signups.state IN ('cancelado', 'liberado')
        RETURNING id
      `
      if (inserted.length === 0) throw new Error('YA_INSCRITO')
    })
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'LLENO') {
        return { error: 'Este turno ya está lleno. Prueba con otro horario.' }
      }
      if (err.message === 'YA_INSCRITO') {
        return { error: 'Ya estás inscrito en este turno con ese número.' }
      }
    }
    throw err
  }

  revalidatePath('/c/' + slug)
  redirect(`/c/${slug}/turno/${shiftId}/listo?t=${token}`)
}
