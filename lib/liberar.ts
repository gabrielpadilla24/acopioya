import 'server-only'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'

export type LiberarStats = { liberados: number; turnos: number }

export async function liberarCuposNoConfirmados(shiftId?: string): Promise<LiberarStats> {
  const filtro = shiftId ? sql`AND sh.id = ${shiftId}` : sql``

  const rows = await sql<{ id: string; n: number; slug: string }[]>`
    WITH liberados AS (
      UPDATE signups s
      SET state = 'liberado', released_at = now()
      FROM shifts sh
      WHERE s.shift_id = sh.id
        AND s.state = 'inscrito'
        AND sh.starts_at - interval '2 hours' <= now()
        AND sh.starts_at > now()
        AND s.created_at < sh.starts_at - interval '4 hours'
        ${filtro}
      RETURNING s.shift_id
    ),
    afectados AS (
      SELECT shift_id, COUNT(*)::int AS n FROM liberados GROUP BY shift_id
    )
    UPDATE shifts
    SET taken = GREATEST(taken - afectados.n, 0)
    FROM afectados, centers
    WHERE shifts.id = afectados.shift_id
      AND centers.id = shifts.center_id
    RETURNING shifts.id, afectados.n AS n, centers.slug
  `

  const liberados = rows.reduce((acc, r) => acc + r.n, 0)
  const turnos    = rows.length

  const slugs = [...new Set(rows.map(r => r.slug))]
  for (const slug of slugs) revalidatePath('/c/' + slug)

  return { liberados, turnos }
}
