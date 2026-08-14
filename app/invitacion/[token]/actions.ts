'use server'

import { redirect } from 'next/navigation'
import { sql }      from '@/lib/db'
import { hashPassword, crearSesion, validarLongitudPassword } from '@/lib/auth'

export type InvitacionState = { error: string } | null

export async function aceptarInvitacion(
  token: string,
  _prev: InvitacionState,
  form: FormData,
): Promise<InvitacionState> {
  const password    = String(form.get('password')    ?? '')
  const confirmacion = String(form.get('confirmacion') ?? '')

  if (!validarLongitudPassword(password)) {
    return { error: 'La contraseña debe tener al menos 10 caracteres.' }
  }
  if (password !== confirmacion) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  // Re-verificar la invitación dentro de la transacción
  const [invite] = await sql<{
    id:        string
    center_id: string
    username:  string
    used_at:   Date | null
    expires_at: Date
  }[]>`
    SELECT id, center_id, username, used_at, expires_at
    FROM coordinator_invites
    WHERE token = ${token}
    LIMIT 1
  `

  if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    return { error: 'Esta invitación ya se usó o venció. Pídele una nueva al administrador.' }
  }

  const passwordHash = await hashPassword(password)

  // Una sola transacción: guarda hash + marca usada
  await sql.begin(async (tx) => {
    await tx`
      UPDATE coordinator_users
      SET password_hash = ${passwordHash}, updated_at = now()
      WHERE center_id = ${invite.center_id}
        AND username   = ${invite.username}
    `
    await tx`
      UPDATE coordinator_invites
      SET used_at = now()
      WHERE id = ${invite.id}
    `
  })

  // Obtener el user_id para crear la sesión
  const [user] = await sql<{ id: string }[]>`
    SELECT id FROM coordinator_users
    WHERE center_id = ${invite.center_id} AND username = ${invite.username}
    LIMIT 1
  `
  if (!user) return { error: 'Error inesperado. Contacta al administrador.' }

  await crearSesion(user.id)
  redirect('/panel')
}
