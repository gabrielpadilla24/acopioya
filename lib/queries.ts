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
  signup_mode: string
}

export type CentroConDatos = Center & {
  needs: Need[]
  shifts: Shift[]
}

// ── tipos públicos (página /c/[slug]) ────────────────────────────────────────

export type CentroPublico = Center & {
  source:          string | null
  data_source_url: string | null
  recepcion_hasta: Date | null
  verified_at:     Date | null
  verified_by:     string | null
}

export type CentroConDatosPublico = CentroPublico & {
  needs:     Need[]
  shifts:    Shift[]
  reclamado: boolean
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
    SELECT slug FROM centers
    WHERE is_active = true
      AND (recepcion_hasta IS NULL OR recepcion_hasta >= current_date)
  `
}

export type SignupConTurno = {
  signup_id: string
  name: string
  phone: string | null
  state: 'inscrito' | 'confirmado' | 'cancelado' | 'liberado' | 'asistio'
  manage_token: string
  shift_id: string
  role: string
  role_detail: string | null
  starts_at: Date
  ends_at: Date
  capacity: number
  overbook_pct: number
  taken: number
  whatsapp_group_url: string | null
  center_id: string
  center_name: string
  center_slug: string
  center_address: string
  center_city: string
  center_status: 'open' | 'full' | 'closed'
  center_whatsapp: string | null
}

export async function obtenerSignupPorToken(token: string): Promise<SignupConTurno | null> {
  const rows = await sql<SignupConTurno[]>`
    SELECT
      sg.id          AS signup_id,
      sg.name,
      sg.phone,
      sg.state,
      sg.manage_token,
      sh.id          AS shift_id,
      sh.role,
      sh.role_detail,
      sh.starts_at,
      sh.ends_at,
      sh.capacity,
      sh.overbook_pct,
      sh.taken,
      sh.whatsapp_group_url,
      c.id           AS center_id,
      c.name         AS center_name,
      c.slug         AS center_slug,
      c.address      AS center_address,
      c.city         AS center_city,
      c.status       AS center_status,
      c.whatsapp_contact AS center_whatsapp
    FROM signups sg
    JOIN shifts sh ON sh.id = sg.shift_id
    JOIN centers c ON c.id  = sh.center_id
    WHERE sg.manage_token = ${token}
    LIMIT 1
  `
  return rows[0] ?? null
}

export type TurnoConCentro = Shift & {
  center_name: string
  center_slug: string
  center_status: 'open' | 'full' | 'closed'
}

export async function obtenerTurnoConCentro(shiftId: string, slug: string): Promise<TurnoConCentro | null> {
  const rows = await sql<TurnoConCentro[]>`
    SELECT
      s.id, s.center_id, s.role, s.role_detail, s.starts_at, s.ends_at,
      s.capacity, s.overbook_pct, s.taken, s.signup_mode,
      c.name AS center_name, c.slug AS center_slug, c.status AS center_status
    FROM shifts s
    JOIN centers c ON c.id = s.center_id
    WHERE s.id = ${shiftId} AND c.slug = ${slug} AND c.is_active = true
    LIMIT 1
  `
  return rows[0] ?? null
}

// ── tipos panel ──────────────────────────────────────────────────────────────

export type ShiftConConteos = Shift & {
  status:             'open' | 'closed'
  whatsapp_group_url: string | null
  confirmados:        number
  inscritos:          number
  liberados:          number
  asistieron:         number
}

export type CentroPanelDetalle = Center & {
  needs:  Need[]
  shifts: ShiftConConteos[]
}

// ── tipos turno panel ─────────────────────────────────────────────────────────

export type SignupParaPanel = {
  id:             string
  name:           string
  phone:          string | null
  state:          'inscrito' | 'confirmado' | 'cancelado' | 'liberado' | 'asistio'
  manage_token:   string
  created_at:     Date
  checked_in_at:  Date | null
  checkin_method: string | null
  is_walk_in:     boolean
}

export type TurnoParaPanel = {
  id:                 string
  center_id:          string
  role:               string
  role_detail:        string | null
  starts_at:          Date
  ends_at:            Date
  capacity:           number
  overbook_pct:       number
  taken:              number
  status:             'open' | 'closed'
  whatsapp_group_url: string | null
  signup_mode:        string
  center_name:        string
  center_slug:        string
  center_status:      'open' | 'full' | 'closed'
  signups:            SignupParaPanel[]
}

// ── session-based panel ──────────────────────────────────────────────────────

export async function obtenerCentroPorId(centerId: string): Promise<CentroPanelDetalle | null> {
  const centers = await sql<Center[]>`
    SELECT id, slug, name, address, city, status,
           coordinator_name, lat, lng, whatsapp_contact, schedule_note, is_active
    FROM centers
    WHERE id = ${centerId}
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
      END, category
    `,
    sql<ShiftConConteos[]>`
      SELECT
        sh.id, sh.center_id, sh.role, sh.role_detail,
        sh.starts_at, sh.ends_at,
        sh.capacity, sh.overbook_pct, sh.taken,
        sh.whatsapp_group_url, sh.status, sh.signup_mode,
        COALESCE(sg.confirmados, 0)::int AS confirmados,
        COALESCE(sg.inscritos,   0)::int AS inscritos,
        COALESCE(sg.liberados,   0)::int AS liberados,
        COALESCE(sg.asistieron,  0)::int AS asistieron
      FROM shifts sh
      LEFT JOIN (
        SELECT shift_id,
          COUNT(*) FILTER (WHERE state = 'confirmado')::int AS confirmados,
          COUNT(*) FILTER (WHERE state = 'inscrito')::int   AS inscritos,
          COUNT(*) FILTER (WHERE state = 'liberado')::int   AS liberados,
          COUNT(*) FILTER (WHERE state = 'asistio')::int    AS asistieron
        FROM signups
        GROUP BY shift_id
      ) sg ON sg.shift_id = sh.id
      WHERE sh.center_id = ${center.id}
        AND sh.ends_at > (date_trunc('day', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota')
      ORDER BY sh.starts_at
    `,
  ])

  return { ...center, needs, shifts }
}

export async function obtenerTurnoPorIdYCentro(
  shiftId: string,
  centerId: string,
): Promise<TurnoParaPanel | null> {
  const shifts = await sql<Omit<TurnoParaPanel, 'signups'>[]>`
    SELECT
      sh.id, sh.center_id, sh.role, sh.role_detail,
      sh.starts_at, sh.ends_at, sh.capacity, sh.overbook_pct, sh.taken,
      sh.status, sh.whatsapp_group_url, sh.signup_mode,
      c.name   AS center_name,
      c.slug   AS center_slug,
      c.status AS center_status
    FROM shifts sh
    JOIN centers c ON c.id = sh.center_id
    WHERE sh.id        = ${shiftId}
      AND sh.center_id = ${centerId}
    LIMIT 1
  `
  if (shifts.length === 0) return null
  const shift = shifts[0]

  const signups = await sql<SignupParaPanel[]>`
    SELECT id, name, phone, state, manage_token,
           created_at, checked_in_at, checkin_method, is_walk_in
    FROM signups
    WHERE shift_id = ${shiftId}
    ORDER BY CASE state
      WHEN 'confirmado' THEN 1
      WHEN 'inscrito'   THEN 2
      WHEN 'asistio'    THEN 3
      WHEN 'liberado'   THEN 4
      WHEN 'cancelado'  THEN 5
      ELSE 6
    END, created_at
  `

  return { ...shift, signups }
}

// ── landing / donar ──────────────────────────────────────────────────────────

export type NecesidadPublica = {
  category: string
  level: 'urgent' | 'needed' | 'enough' | 'do_not_bring'
}

export type CentroParaLanding = {
  id:               string
  slug:             string
  name:             string
  city:             string
  address:          string
  status:           'open' | 'full' | 'closed'
  lat:              number | null
  lng:              number | null
  whatsapp_contact: string | null
  coordinator_name: string | null
  schedule_note:    string | null
  urgent_count:     number
  available_shifts: number
  last_need_update: Date | null
  verified_at:      Date | null
  reclamado:        boolean
  needs:            NecesidadPublica[]
}

type CentroParaLandingRow = Omit<CentroParaLanding, 'needs'> & {
  // postgres.js parses json_agg → JS array automatically
  needs: NecesidadPublica[]
}

export async function obtenerCentrosParaLanding(): Promise<CentroParaLanding[]> {
  return sql<CentroParaLandingRow[]>`
    SELECT
      c.id, c.slug, c.name, c.city, c.address, c.status,
      c.lat, c.lng, c.whatsapp_contact, c.coordinator_name, c.schedule_note,
      COALESCE(ns.urgent_count, 0)::int      AS urgent_count,
      COALESCE(avail.available_shifts, 0)::int AS available_shifts,
      ns.last_need_update,
      c.verified_at,
      EXISTS(
        SELECT 1 FROM coordinator_users cu
        WHERE cu.center_id = c.id AND cu.password_hash IS NOT NULL
      ) AS reclamado,
      COALESCE(ns.needs_agg, '[]'::json)     AS needs
    FROM centers c
    LEFT JOIN (
      SELECT
        center_id,
        COUNT(*) FILTER (WHERE level = 'urgent')::int AS urgent_count,
        MAX(updated_at)                               AS last_need_update,
        json_agg(
          json_build_object('category', category, 'level', level)
          ORDER BY
            CASE level
              WHEN 'urgent'       THEN 1
              WHEN 'needed'       THEN 2
              WHEN 'enough'       THEN 3
              ELSE 4
            END,
            category
        )                                             AS needs_agg
      FROM needs
      GROUP BY center_id
    ) ns    ON ns.center_id    = c.id
    LEFT JOIN (
      SELECT center_id, COUNT(*)::int AS available_shifts
      FROM shifts
      WHERE status = 'open' AND ends_at > now() AND taken < capacity
      GROUP BY center_id
    ) avail ON avail.center_id = c.id
    WHERE c.is_active = true
      AND (c.recepcion_hasta IS NULL OR c.recepcion_hasta >= current_date)
    ORDER BY COALESCE(ns.urgent_count, 0) DESC, c.name
  `
}

// ── queries existentes ───────────────────────────────────────────────────────

export async function obtenerCentroPorSlug(slug: string): Promise<CentroConDatosPublico | null> {
  const centers = await sql<(CentroPublico & { reclamado: boolean })[]>`
    SELECT c.id, c.slug, c.name, c.address, c.city, c.status,
           c.coordinator_name, c.lat, c.lng, c.whatsapp_contact, c.schedule_note, c.is_active,
           c.source, c.data_source_url, c.recepcion_hasta, c.verified_at, c.verified_by,
           EXISTS(
             SELECT 1 FROM coordinator_users cu
             WHERE cu.center_id = c.id AND cu.password_hash IS NOT NULL
           ) AS reclamado
    FROM centers c
    WHERE c.slug = ${slug} AND c.is_active = true
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
             capacity, overbook_pct, taken, signup_mode
      FROM shifts
      WHERE center_id = ${center.id}
        AND status = 'open'
        AND ends_at > now()
      ORDER BY starts_at
    `,
  ])

  return { ...center, needs, shifts }
}
