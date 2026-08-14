import 'server-only'
import { randomBytes, createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcrypt'
import { sql } from '@/lib/db'

const COOKIE_NAME    = 'acopioya_sesion'
const BCRYPT_ROUNDS  = 12
const SESSION_DAYS   = 30
const SESSION_MS     = SESSION_DAYS * 24 * 60 * 60 * 1000
const SESSION_SECS   = SESSION_DAYS * 24 * 60 * 60
const MIN_PASSWORD   = 10

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

function sha256hex(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function generarTokenOpaco(): string {
  return randomBytes(32).toString('base64url')
}

export function validarLongitudPassword(plain: string): boolean {
  return plain.length >= MIN_PASSWORD
}

export async function crearSesion(userId: string): Promise<void> {
  const token     = generarTokenOpaco()
  const tokenHash = sha256hex(token)
  const expiresAt = new Date(Date.now() + SESSION_MS)

  await sql`
    INSERT INTO coordinator_sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === 'production',
    sameSite:  'lax',
    path:      '/',
    maxAge:    SESSION_SECS,
  })
}

type SesionActiva = {
  user: {
    id:       string
    username: string
    centerId: string
  }
}

export async function obtenerSesion(): Promise<SesionActiva | null> {
  const jar   = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  const tokenHash = sha256hex(token)

  const [row] = await sql<{
    user_id:   string
    username:  string
    center_id: string
    expires_at: Date
  }[]>`
    SELECT cs.user_id, cu.username, cu.center_id, cs.expires_at
    FROM coordinator_sessions cs
    JOIN coordinator_users cu ON cu.id = cs.user_id
    WHERE cs.token_hash = ${tokenHash}
      AND cu.is_active  = true
    LIMIT 1
  `

  if (!row) return null
  if (new Date(row.expires_at) < new Date()) {
    await sql`DELETE FROM coordinator_sessions WHERE token_hash = ${tokenHash}`
    return null
  }

  return {
    user: {
      id:       row.user_id,
      username: row.username,
      centerId: row.center_id,
    },
  }
}

export async function cerrarSesion(): Promise<void> {
  const jar   = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token) {
    const tokenHash = sha256hex(token)
    await sql`DELETE FROM coordinator_sessions WHERE token_hash = ${tokenHash}`
  }
  jar.delete(COOKIE_NAME)
}

export async function requiereSesion(): Promise<SesionActiva> {
  const sesion = await obtenerSesion()
  if (!sesion) redirect('/entrar')
  return sesion
}
