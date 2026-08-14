import { obtenerSignupPorToken } from '@/lib/queries'
import { ROLES, type Rol }       from '@/lib/constants'

function toICSUTC(d: Date): string {
  // "2026-08-15T13:00:00.000Z" → "20260815T130000Z"
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
}

function icsEsc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g,  '\\;')
    .replace(/,/g,  '\\,')
    .replace(/\n/g, '\\n')
}

// RFC 5545 §3.1 — fold at 75 octets (approximate with char count for ASCII-safe fold)
function icsFold(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = [line.slice(0, 75)]
  let i = 75
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74))
    i += 74
  }
  return chunks.join('\r\n')
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const sg = await obtenerSignupPorToken(token)

  if (!sg) return new Response('Not Found', { status: 404 })

  const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acopioya.vercel.app'
  const manageUrl = `${SITE_URL}/v/${token}`
  const rolLabel  = ROLES[sg.role as Rol] ?? sg.role

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AcopioYA//Turno Voluntariado//ES',
    'BEGIN:VEVENT',
    `UID:${sg.signup_id}@acopioya.vercel.app`,
    `DTSTAMP:${toICSUTC(new Date())}`,
    `DTSTART:${toICSUTC(new Date(sg.starts_at))}`,
    `DTEND:${toICSUTC(new Date(sg.ends_at))}`,
    icsFold(`SUMMARY:Voluntariado: ${icsEsc(rolLabel)} — ${icsEsc(sg.center_name)}`),
    icsFold(`LOCATION:${icsEsc(sg.center_address + ', ' + sg.center_city)}`),
    icsFold(`DESCRIPTION:${icsEsc('Gestiona tu inscripción en:\n' + manageUrl)}`),
    'BEGIN:VALARM',
    'TRIGGER:-PT4H',
    'ACTION:DISPLAY',
    icsFold('DESCRIPTION:¡Confirma tu asistencia en AcopioYA!'),
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const body = lines.join('\r\n') + '\r\n'

  return new Response(body, {
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="turno-acopioya.ics"',
    },
  })
}
