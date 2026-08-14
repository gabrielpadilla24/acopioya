import 'server-only'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'

export type LiberarStats = { liberados: number; turnos: number }

export async function liberarCuposNoConfirmados(shiftId?: string): Promise<LiberarStats> {
  const filtro = shiftId ? sql`AND sh.id = ${shiftId}` : sql``

  // NOTA (2026-08): desde el cambio a inscripción directa a confirmado, ningún
  // signup nace en state = 'inscrito'. Esta condición nunca encuentra filas y la
  // función retorna siempre { liberados: 0, turnos: 0 }. Se conserva intacta por
  // si el modelo vuelve a cambiar. El botón manual del panel usará una función
  // separada (liberarAusentes) que opera sobre state = 'confirmado'.
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

// Cuenta cupos liberables con la MISMA condición que liberarAusentes.
// Se llama antes del confirm para mostrar el número exacto al coordinador.
export async function contarAusentes(shiftId: string): Promise<number> {
  const [row] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM signups s
    JOIN shifts sh ON sh.id = s.shift_id
    WHERE s.state = 'confirmado'
      AND sh.id = ${shiftId}
      AND sh.starts_at + interval '30 minutes' <= now()
      AND sh.ends_at > now() - interval '24 hours'
  `
  return row?.count ?? 0
}

// Libera cupos de ausentes: opera sobre 'confirmado' (no sobre 'inscrito').
// Condición idéntica a contarAusentes para que el número mostrado y el liberado coincidan.
// Patrón atómico de decremento copiado de liberarCuposNoConfirmados sin modificaciones.
export async function liberarAusentes(shiftId: string): Promise<LiberarStats> {
  const rows = await sql<{ id: string; n: number; slug: string }[]>`
    WITH liberados AS (
      UPDATE signups s
      SET state = 'liberado', released_at = now()
      FROM shifts sh
      WHERE s.shift_id = sh.id
        AND s.state = 'confirmado'
        AND sh.id = ${shiftId}
        AND sh.starts_at + interval '30 minutes' <= now()
        AND sh.ends_at > now() - interval '24 hours'
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
