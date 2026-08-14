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

