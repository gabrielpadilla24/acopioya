import { sql } from '@/lib/db'
import { ROLES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const BOG = 'America/Bogota'

function fmtFecha(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: BOG, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d)
}

function fmtHora(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: BOG, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d)
}

function fmtFechaHora(d: Date | null): string {
  if (!d) return ''
  return `${fmtFecha(d)}, ${fmtHora(d)}`
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

type Row = {
  starts_at: Date
  ends_at:   Date
  role:      string
  name:      string
  phone:     string | null
  state:     string
  created_at:    Date
  checked_in_at: Date | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const [center] = await sql<{ id: string; slug: string }[]>`
    SELECT id, slug FROM centers WHERE admin_token = ${token} LIMIT 1
  `
  if (!center) return new Response('Not Found', { status: 404 })

  const rows = await sql<Row[]>`
    SELECT
      sh.starts_at, sh.ends_at, sh.role,
      sg.name, sg.phone, sg.state, sg.created_at, sg.checked_in_at
    FROM signups sg
    JOIN shifts  sh ON sh.id  = sg.shift_id
    JOIN centers c  ON c.id   = sh.center_id
    WHERE c.id = ${center.id}
    ORDER BY sh.starts_at ASC, sg.name ASC
  `

  const COLS = [
    'turno_fecha', 'turno_hora_inicio', 'turno_hora_fin', 'rol',
    'nombre', 'celular', 'estado', 'inscrito_el', 'llego_el',
  ]
  const lines: string[] = [COLS.join(',')]

  for (const row of rows) {
    const starts = new Date(row.starts_at)
    const ends   = new Date(row.ends_at)
    const rolLabel = (ROLES as Record<string, string>)[row.role] ?? row.role
    lines.push([
      csvEscape(fmtFecha(starts)),
      csvEscape(fmtHora(starts)),
      csvEscape(fmtHora(ends)),
      csvEscape(rolLabel),
      csvEscape(row.name),
      csvEscape(row.phone ?? ''),
      csvEscape(row.state),
      csvEscape(fmtFechaHora(new Date(row.created_at))),
      csvEscape(row.checked_in_at ? fmtFechaHora(new Date(row.checked_in_at)) : ''),
    ].join(','))
  }

  const fechaHoy = new Intl.DateTimeFormat('es-CO', {
    timeZone: BOG, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date()).replace(/\//g, '-')

  const filename = `inscritos-${center.slug}-${fechaHoy}.csv`
  const body = '﻿' + lines.join('\r\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
