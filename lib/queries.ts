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

// ── tipos home ──────────────────────────────────────────────────────────────

export type CentroHome = {
  id: string
  slug: string
  name: string
  city: string
  status: 'open' | 'full' | 'closed'
  urgent_count: number
  available_shifts: number
}

export type TurnoDescubierto = {
  id: string
  role: string
  starts_at: Date
  ends_at: Date
  capacity: number
  taken: number
  center_name: string
  center_slug: string
}

// ── queries home ─────────────────────────────────────────────────────────────

// Filtro por ciudad: listo para cuando haya centros fuera de Bogotá.
export async function obtenerCentrosParaHome(ciudad?: string): Promise<CentroHome[]> {
  const cityClause = ciudad ? sql`AND c.city = ${ciudad}` : sql``
  return sql<CentroHome[]>`
    SELECT
      c.id, c.slug, c.name, c.city, c.status,
      COALESCE(n.urgent_count, 0)::int     AS urgent_count,
      COALESCE(s.available_shifts, 0)::int AS available_shifts
    FROM centers c
    LEFT JOIN (
      SELECT center_id, COUNT(*)::int AS urgent_count
      FROM needs WHERE level = 'urgent'
      GROUP BY center_id
    ) n ON n.center_id = c.id
    LEFT JOIN (
      SELECT center_id, COUNT(*)::int AS available_shifts
      FROM shifts
      WHERE status = 'open' AND ends_at > now() AND taken < capacity
      GROUP BY center_id
    ) s ON s.center_id = c.id
    WHERE c.is_active = true ${cityClause}
    ORDER BY urgent_count DESC, available_shifts DESC, c.name
  `
}

export async function obtenerTurnosDescubiertos(): Promise<TurnoDescubierto[]> {
  return sql<TurnoDescubierto[]>`
    SELECT
      s.id, s.role, s.starts_at, s.ends_at, s.capacity, s.taken,
      c.name AS center_name, c.slug AS center_slug
    FROM shifts s
    JOIN centers c ON c.id = s.center_id
    WHERE s.status = 'open'
      AND s.starts_at >= now()
      AND s.starts_at <= now() + INTERVAL '24 hours'
      AND s.taken < s.capacity
      AND c.is_active = true
    ORDER BY (s.taken::float / s.capacity) ASC, s.starts_at ASC
    LIMIT 6
  `
}

// Filtro por ciudad: listo para cuando haya centros fuera de Bogotá.
export async function obtenerCiudades(): Promise<string[]> {
  const rows = await sql<{ city: string }[]>`
    SELECT DISTINCT city FROM centers WHERE is_active = true ORDER BY city
  `
  return rows.map(r => r.city)
}

// ── queries existentes ───────────────────────────────────────────────────────

export async function listarSlugsActivos(): Promise<{ slug: string }[]> {
  return sql<{ slug: string }[]>`
    SELECT slug FROM centers WHERE is_active = true
  `
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
