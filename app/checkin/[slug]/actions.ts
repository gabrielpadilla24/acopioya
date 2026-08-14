'use server'

import { headers }         from 'next/headers'
import { revalidatePath }  from 'next/cache'
import { sql }             from '@/lib/db'
import { normalizarCelular } from '@/lib/phone'
import { limitar }         from '@/lib/ratelimit'
import { ROLES, type Rol } from '@/lib/constants'
import { rangoHorario }    from '@/lib/time'

export type CheckinState =
  | null
  | { status: 'error' | 'nomatch'; message: string }
  | { status: 'success'; nombre: string; rol: string; horario: string; coordinador: string | null }

const RATE_MSG = 'Demasiados intentos. Espera un momento o acércate al coordinador.'

export async function registrarLlegada(
  slug: string,
  _prevState: CheckinState,
  formData: FormData,
): Promise<CheckinState> {
  // ── 1. Rate limit por IP ─────────────────────────────────────────────────
  const hdrs = await headers()
  const ip   = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? hdrs.get('x-real-ip')
           ?? 'unknown'
  if (!limitar('ip:' + ip, 20, 60 * 60 * 1000)) {
    return { status: 'error', message: RATE_MSG }
  }

  // ── 2. Normalizar celular ────────────────────────────────────────────────
  const celularRaw    = (formData.get('celular') as string ?? '').trim()
  const celularResult = normalizarCelular(celularRaw)
  if (!celularResult.ok) {
    return { status: 'error', message: celularResult.error }
  }
  const phone = celularResult.valor

  // ── 3. Rate limit por celular (oráculo: limita quién puede probar qué) ──
  if (!limitar('phone:' + phone, 5, 60 * 60 * 1000)) {
    return { status: 'error', message: RATE_MSG }
  }

  // ── 4. Buscar signup ─────────────────────────────────────────────────────
  // Incluye 'asistio' para que un doble toque muestre éxito sin romper nada.
  const rows = await sql<{
    id:               string
    name:             string
    state:            string
    shift_id:         string
    role:             string
    role_detail:      string | null
    starts_at:        Date
    ends_at:          Date
    coordinator_name: string | null
    center_slug:      string
    admin_token:      string
  }[]>`
    SELECT
      sg.id, sg.name, sg.state,
      sh.id           AS shift_id,
      sh.role, sh.role_detail, sh.starts_at, sh.ends_at,
      c.coordinator_name, c.slug AS center_slug, c.admin_token
    FROM signups sg
    JOIN shifts  sh ON sh.id = sg.shift_id
    JOIN centers c  ON c.id  = sh.center_id
    WHERE sg.phone  = ${phone}
      AND c.slug    = ${slug}
      AND sg.state  IN ('inscrito', 'confirmado', 'liberado', 'asistio')
      AND sh.starts_at BETWEEN now() - interval '12 hours' AND now() + interval '12 hours'
    ORDER BY ABS(EXTRACT(EPOCH FROM (sh.starts_at - now())))
    LIMIT 1
  `

  if (rows.length === 0) {
    return {
      status:  'nomatch',
      message: 'No encontramos una inscripción tuya para hoy en este centro. Acércate al coordinador para registrarte.',
    }
  }

  const sg = rows[0]

  // ── 5. Marcar asistencia (idempotente) ───────────────────────────────────
  await sql`
    UPDATE signups
    SET state = 'asistio', checked_in_at = now(), checkin_method = 'qr'
    WHERE id    = ${sg.id}
      AND state NOT IN ('asistio', 'cancelado')
  `

  // ── 6. Revalidar panel y página pública ──────────────────────────────────
  revalidatePath('/panel/' + sg.admin_token + '/turno/' + sg.shift_id)
  revalidatePath('/panel/' + sg.admin_token)
  revalidatePath('/c/' + sg.center_slug)

  // ── 7. Éxito — solo datos de la persona que hizo el check-in ────────────
  const rolLabel = (ROLES as Record<string, string>)[sg.role] ?? sg.role
  const detalle  = sg.role_detail ? ` — ${sg.role_detail}` : ''

  return {
    status:      'success',
    nombre:      sg.name,
    rol:         rolLabel + detalle,
    horario:     rangoHorario(new Date(sg.starts_at), new Date(sg.ends_at)),
    coordinador: sg.coordinator_name,
  }
}
