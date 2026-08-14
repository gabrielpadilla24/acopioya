'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { sql }            from '@/lib/db'

export async function cancelar(token: string, _formData: FormData): Promise<void> {
  // Pre-read slug for revalidation (outside transaction — correctness not affected)
  const [info] = await sql<{ center_slug: string }[]>`
    SELECT c.slug AS center_slug
    FROM signups sg
    JOIN shifts sh ON sh.id = sg.shift_id
    JOIN centers c ON c.id  = sh.center_id
    WHERE sg.manage_token = ${token}
    LIMIT 1
  `

  await sql.begin(async (tx) => {
    // Idempotent: only transitions if currently inscrito or confirmado
    const [updated] = await tx<{ shift_id: string }[]>`
      UPDATE signups
      SET state = 'cancelado', cancelled_at = now()
      WHERE manage_token = ${token}
        AND state IN ('inscrito', 'confirmado')
      RETURNING shift_id
    `
    // Decrement taken ONLY when we actually changed state
    if (updated) {
      await tx`
        UPDATE shifts SET taken = GREATEST(taken - 1, 0)
        WHERE id = ${updated.shift_id}
      `
    }
  })

  if (info) revalidatePath('/c/' + info.center_slug)
  revalidatePath('/v/' + token)
  redirect('/v/' + token)
}

export async function confirmar(token: string, _formData: FormData): Promise<void> {
  const [info] = await sql<{ center_slug: string }[]>`
    SELECT c.slug AS center_slug
    FROM signups sg
    JOIN shifts sh ON sh.id = sg.shift_id
    JOIN centers c ON c.id  = sh.center_id
    WHERE sg.manage_token = ${token}
    LIMIT 1
  `

  // Single conditional UPDATE — no pre-read, all conditions in WHERE
  const [updated] = await sql<{ id: string }[]>`
    UPDATE signups
    SET state = 'confirmado', confirmed_at = now()
    FROM shifts
    WHERE signups.manage_token = ${token}
      AND signups.state = 'inscrito'
      AND shifts.id = signups.shift_id
      AND now() >= shifts.starts_at - interval '4 hours'
      AND now() < shifts.starts_at
    RETURNING signups.id
  `

  if (!updated) {
    // Read after failure to produce a human-readable error
    const [sg] = await sql<{ state: string; starts_at: Date }[]>`
      SELECT sg.state, sh.starts_at
      FROM signups sg
      JOIN shifts sh ON sh.id = sg.shift_id
      WHERE sg.manage_token = ${token}
      LIMIT 1
    `
    const now = Date.now()
    let msg: string
    if (!sg) {
      msg = 'Inscripción no encontrada.'
    } else if (sg.state !== 'inscrito') {
      msg = sg.state === 'liberado'
        ? 'Tu cupo fue liberado porque no confirmaste a tiempo.'
        : `No puedes confirmar en el estado actual (${sg.state}).`
    } else if (now < new Date(sg.starts_at).getTime() - 4 * 60 * 60 * 1000) {
      msg = 'Aún no es hora de confirmar. El botón se habilita 4 horas antes del turno.'
    } else {
      msg = 'El turno ya comenzó. No es posible confirmar después del inicio.'
    }
    redirect('/v/' + token + '?msg=' + encodeURIComponent(msg))
  }

  if (info) revalidatePath('/c/' + info.center_slug)
  revalidatePath('/v/' + token)
  redirect('/v/' + token)
}
