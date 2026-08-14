// TEMPORAL — borrar en Bloque 4.
export const dynamic = 'force-dynamic'

import { sql } from '@/lib/db'
import { rangoHorario } from '@/lib/time'

type Center = { id: string; slug: string; status: string }
type Need   = { center_id: string }
type Shift  = { center_id: string; starts_at: Date; ends_at: Date; role: string }

export default async function DebugPage() {
  const centers = await sql<Center[]>`SELECT id, slug, status FROM centers ORDER BY slug`
  const needs   = await sql<Need[]>`SELECT center_id FROM needs`
  const shifts  = await sql<Shift[]>`SELECT center_id, starts_at, ends_at, role FROM shifts ORDER BY starts_at`

  const countNeeds = (id: string) => needs.filter(n => n.center_id === id).length
  const shiftsFor  = (id: string) => shifts.filter(s => s.center_id === id)

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>Debug — Centers en BD</h1>
      {centers.map(c => (
        <section key={c.id} style={{ marginBottom: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
          <p>
            <strong>slug:</strong> {c.slug} |{' '}
            <strong>status:</strong> {c.status} |{' '}
            <strong>needs:</strong> {countNeeds(c.id)} |{' '}
            <strong>shifts:</strong> {shiftsFor(c.id).length}
          </p>
          <ul>
            {shiftsFor(c.id).map((s, i) => (
              <li key={i}>{s.role}: {rangoHorario(new Date(s.starts_at), new Date(s.ends_at))}</li>
            ))}
          </ul>
        </section>
      ))}
      {centers.length === 0 && <p>No hay centers en la BD.</p>}
    </main>
  )
}
