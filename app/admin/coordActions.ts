'use server'

import { sql }              from '@/lib/db'
import { generarTokenAdmin } from '@/lib/tokens'
import { revalidatePath }   from 'next/cache'

export type CoordAccesoState = {
  error?:     string
  inviteUrl?: string   // URL completa del link de invitación
} | null

const EXPIRA_DIAS = 7

// Crear acceso inicial (usuario + invitación)
export async function crearAccesoCoord(
  centerId: string,
  siteUrl:  string,
  prevState: CoordAccesoState,
  form: FormData,
): Promise<CoordAccesoState> {
  const username = String(form.get('username') ?? '').trim().toLowerCase()
  if (!username || username.length < 3) {
    return { error: 'El usuario debe tener al menos 3 caracteres.' }
  }
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return { error: 'Solo letras minúsculas, números, guiones y guiones bajos.' }
  }

  const token    = generarTokenAdmin()
  const expiresAt = new Date(Date.now() + EXPIRA_DIAS * 24 * 60 * 60 * 1000)

  try {
    await sql.begin(async (tx) => {
      // Upsert: si ya existía (password_hash null), lo reutiliza
      await tx`
        INSERT INTO coordinator_users (center_id, username)
        VALUES (${centerId}, ${username})
        ON CONFLICT (username) DO NOTHING
      `
      await tx`
        INSERT INTO coordinator_invites (center_id, token, username, expires_at)
        VALUES (${centerId}, ${token}, ${username}, ${expiresAt})
      `
    })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    if (code === '23505') {
      return { error: 'Ese nombre de usuario ya está en uso. Elige otro.' }
    }
    return { error: 'Error al crear el acceso. Intenta de nuevo.' }
  }

  revalidatePath('/admin')
  return { inviteUrl: `${siteUrl}/invitacion/${token}` }
}

// Regenerar invitación (la contraseña existente sigue funcionando)
export async function regenerarInvitacion(
  centerId:  string,
  username:  string,
  siteUrl:   string,
  prevState: CoordAccesoState,
  _form:     FormData,
): Promise<CoordAccesoState> {
  const token    = generarTokenAdmin()
  const expiresAt = new Date(Date.now() + EXPIRA_DIAS * 24 * 60 * 60 * 1000)

  try {
    await sql`
      INSERT INTO coordinator_invites (center_id, token, username, expires_at)
      VALUES (${centerId}, ${token}, ${username}, ${expiresAt})
    `
  } catch {
    return { error: 'Error al crear la invitación. Intenta de nuevo.' }
  }

  revalidatePath('/admin')
  return { inviteUrl: `${siteUrl}/invitacion/${token}` }
}

// Invalidar sesiones activas + nueva invitación (fuerza al coordinador a re-entrar)
export async function invalidarSesionesYRegenerarInvitacion(
  centerId:  string,
  userId:    string,
  username:  string,
  siteUrl:   string,
  prevState: CoordAccesoState,
  _form:     FormData,
): Promise<CoordAccesoState> {
  const token    = generarTokenAdmin()
  const expiresAt = new Date(Date.now() + EXPIRA_DIAS * 24 * 60 * 60 * 1000)

  try {
    await sql.begin(async (tx) => {
      await tx`
        DELETE FROM coordinator_sessions WHERE user_id = ${userId}
      `
      await tx`
        INSERT INTO coordinator_invites (center_id, token, username, expires_at)
        VALUES (${centerId}, ${token}, ${username}, ${expiresAt})
      `
    })
  } catch {
    return { error: 'Error al regenerar el acceso. Intenta de nuevo.' }
  }

  revalidatePath('/admin')
  return { inviteUrl: `${siteUrl}/invitacion/${token}` }
}

