import 'server-only'
import { sql } from '@/lib/db'

export type Center = {
  id: string
  slug: string
  name: string
  address: string
  city: string
  status: 'open' | 'full' | 'closed'
  coordinator_name: string | null
  lat: number | null
  lng: number | null
  whatsapp_contact: string | null
  schedule_note: string | null
  is_active: boolean
}

export type Need = {
  id: string
  center_id: string
  category: string
  level: 'urgent' | 'needed' | 'enough' | 'do_not_bring'
  note: string | null
  updated_at: Date
}

export type Shift = {
  id: string
  center_id: string
  role: string
  role_detail: string | null
  starts_at: Date
  ends_at: Date
  capacity: number
  overbook_pct: number
  taken: number
}

export type CentroConDatos = Center & {
  needs: Need[]
  shifts: Shift[]
}

export async function obtenerCentroPorSlug(slug: string): Promise<CentroConDatos | null> {
  const centers = await sql<Center[]>`
    SELECT id, slug, name, address, city, status,
           coordinator_name, lat, lng, whatsapp_contact, schedule_note, is_active
    FROM centers
    WHERE slug = ${slug} AND is_active = true
    LIMIT 1
  `

  if (centers.length === 0) return null
  const center = centers[0]

  const [needs, shifts] = await Promise.all([
    sql<Need[]>`
      SELECT id, center_id, category, level, note, updated_at
      FROM needs
      WHERE center_id = ${center.id}
      ORDER BY CASE level
        WHEN 'urgent'       THEN 1
        WHEN 'needed'       THEN 2
        WHEN 'do_not_bring' THEN 3
        WHEN 'enough'       THEN 4
        ELSE 5
      END
    `,
    sql<Shift[]>`
      SELECT id, center_id, role, role_detail, starts_at, ends_at,
             capacity, overbook_pct, taken
      FROM shifts
      WHERE center_id = ${center.id}
        AND status = 'open'
        AND ends_at > now()
      ORDER BY starts_at
    `,
  ])

  return { ...center, needs, shifts }
}
