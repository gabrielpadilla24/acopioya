'use server'

import { redirect } from 'next/navigation'
import { sql }          from '@/lib/db'
import { limitar }      from '@/lib/ratelimit'
import { verifyPassword, crearSesion } from '@/lib/auth'

const MSG_GENERICO = 'Usuario o contraseña incorrectos.'
const MAX_INTENTOS = 5
const VENTANA_MS   = 15 * 60 * 1000  // 15 minutos

export type LoginState = { error: string } | null

export async function loginAction(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  const usuario   = String(form.get('usuario')   ?? '').trim().toLowerCase()
  const password  = String(form.get('password')  ?? '')

  if (!usuario || !password) return { error: MSG_GENERICO }

  // Rate limit por nombre de usuario (best-effort en serverless)
  if (!limitar(`login:${usuario}`, MAX_INTENTOS, VENTANA_MS)) {
    return { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' }
  }

  const [user] = await sql<{
    id:            string
    password_hash: string | null
    is_active:     boolean
    center_id:     string
  }[]>`
    SELECT id, password_hash, is_active, center_id
    FROM coordinator_users
    WHERE username = ${usuario}
    LIMIT 1
  `

  // Sin usuario, sin contraseña configurada o inactivo → mismo error genérico
  // Retardo artificial de ~300ms para no dar pistas por timing
  if (!user || !user.password_hash || !user.is_active) {
    await new Promise(r => setTimeout(r, 300))
    return { error: MSG_GENERICO }
  }

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) {
    await new Promise(r => setTimeout(r, 300))
    return { error: MSG_GENERICO }
  }

  await sql`
    UPDATE coordinator_users
    SET last_login_at = now(), updated_at = now()
    WHERE id = ${user.id}
  `
  await crearSesion(user.id)
  redirect('/panel')
}
