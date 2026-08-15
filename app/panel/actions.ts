'use server'

import { revalidatePath }  from 'next/cache'
import { redirect }        from 'next/navigation'
import { sql }             from '@/lib/db'
import { cerrarSesion, requiereSesion } from '@/lib/auth'

export async function salir(): Promise<void> {
  await cerrarSesion()
  redirect('/entrar')
}

async function getCentroDeSession(): Promise<{ id: string; slug: string }> {
  const sesion = await requiereSesion()
  const [centro] = await sql<{ id: string; slug: string }[]>`
    SELECT id, slug FROM centers WHERE id = ${sesion.user.centerId} LIMIT 1
  `
  if (!centro) redirect('/entrar')
  return centro
}

// ── 1. Cambiar estado del centro ─────────────────────────────────────────────

export async function cambiarEstadoCentro(
  estado: string,
  _formData: FormData,
): Promise<void> {
  const centro = await getCentroDeSession()
  await sql`UPDATE centers SET status = ${estado}, updated_at = now() WHERE id = ${centro.id}`
  revalidatePath('/c/' + centro.slug)
  revalidatePath('/')
  redirect('/panel')
}

// ── 2. Cambiar nivel de necesidad ────────────────────────────────────────────

export async function cambiarNivelNecesidad(
  needId: string,
  nivel: string,
  _formData: FormData,
): Promise<void> {
  const centro = await getCentroDeSession()
  await sql`
    UPDATE needs SET level = ${nivel}, updated_at = now()
    WHERE id = ${needId} AND center_id = ${centro.id}
  `
  revalidatePath('/c/' + centro.slug)
  redirect('/panel')
}

// ── 3. Agregar necesidad ─────────────────────────────────────────────────────

export async function agregarNecesidad(formData: FormData): Promise<void> {
  const centro = await getCentroDeSession()
  const categoria = (formData.get('categoria') as string ?? '').trim().toLowerCase()
  if (!categoria) {
    redirect('/panel?msg=' + encodeURIComponent('Escribe el nombre de la categoría.'))
  }
  const existing = await sql<{ id: string }[]>`
    SELECT id FROM needs WHERE center_id = ${centro.id} AND category = ${categoria} LIMIT 1
  `
  if (existing.length > 0) {
    redirect('/panel?msg=' + encodeURIComponent('Esa categoría ya está en la lista.'))
  }
  await sql`
    INSERT INTO needs (center_id, category, level, updated_at)
    VALUES (${centro.id}, ${categoria}, 'needed', now())
  `
  revalidatePath('/c/' + centro.slug)
  redirect('/panel')
}

// ── 4. Eliminar necesidad ────────────────────────────────────────────────────

export async function eliminarNecesidad(needId: string): Promise<void> {
  const centro = await getCentroDeSession()
  await sql`DELETE FROM needs WHERE id = ${needId} AND center_id = ${centro.id}`
  revalidatePath('/c/' + centro.slug)
  redirect('/panel')
}

// ── 5. Crear turno ───────────────────────────────────────────────────────────

export async function crearTurno(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const centro = await getCentroDeSession()

  const rol         = (formData.get('rol')          as string ?? '').trim()
  const roleDetail  = (formData.get('role_detail')   as string ?? '').trim() || null
  const fecha       = (formData.get('fecha')         as string ?? '').trim()
  const horaInicio  = (formData.get('hora_inicio')   as string ?? '').trim()
  const horaFin     = (formData.get('hora_fin')      as string ?? '').trim()
  const capacidad   = parseInt(formData.get('capacidad')    as string, 10)
  const overbookPct = parseInt(formData.get('overbook_pct') as string || '0', 10)
  const waGroupUrl  = (formData.get('wa_group_url')  as string ?? '').trim() || null
  const signupMode  = formData.get('signup_mode') === 'contacto' ? 'contacto' : 'self'

  if (!rol || !fecha || !horaInicio || !horaFin || isNaN(capacidad) || capacidad < 1) {
    return { error: 'Completa los campos obligatorios (rol, fecha, horario, cupos).' }
  }
  if (overbookPct < 0 || overbookPct > 100) {
    return { error: 'La tolerancia debe estar entre 0 y 100.' }
  }

  const [year, month, day] = fecha.split('-').map(Number)
  const [startH, startM]   = horaInicio.split(':').map(Number)
  const [endH,   endM]     = horaFin.split(':').map(Number)

  const startsAt = new Date(Date.UTC(year, month - 1, day, startH + 5, startM))
  let   endsAt   = new Date(Date.UTC(year, month - 1, day, endH   + 5, endM))
  if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86_400_000)

  if (startsAt <= new Date()) {
    return { error: 'El horario de inicio debe ser en el futuro.' }
  }

  await sql`
    INSERT INTO shifts
      (center_id, role, role_detail, starts_at, ends_at, capacity, overbook_pct, whatsapp_group_url, signup_mode, taken)
    VALUES
      (${centro.id}, ${rol}, ${roleDetail}, ${startsAt}, ${endsAt}, ${capacidad}, ${overbookPct}, ${waGroupUrl}, ${signupMode}, 0)
  `
  revalidatePath('/c/' + centro.slug)
  revalidatePath('/')
  redirect('/panel')
}

// ── 6. Duplicar turno (+1 día) ───────────────────────────────────────────────

export async function duplicarTurno(
  shiftId: string,
  _formData: FormData,
): Promise<void> {
  const centro = await getCentroDeSession()
  const rows = await sql<{
    role: string; role_detail: string | null
    starts_at: Date; ends_at: Date
    capacity: number; overbook_pct: number; whatsapp_group_url: string | null
    signup_mode: string
  }[]>`
    SELECT role, role_detail, starts_at, ends_at, capacity, overbook_pct, whatsapp_group_url, signup_mode
    FROM shifts WHERE id = ${shiftId} AND center_id = ${centro.id} LIMIT 1
  `
  if (rows.length === 0) redirect('/panel')
  const s = rows[0]

  const newStartsAt = new Date(new Date(s.starts_at).getTime() + 86_400_000)
  const newEndsAt   = new Date(new Date(s.ends_at).getTime()   + 86_400_000)

  await sql`
    INSERT INTO shifts
      (center_id, role, role_detail, starts_at, ends_at, capacity, overbook_pct, whatsapp_group_url, signup_mode, taken)
    VALUES
      (${centro.id}, ${s.role}, ${s.role_detail}, ${newStartsAt}, ${newEndsAt},
       ${s.capacity}, ${s.overbook_pct}, ${s.whatsapp_group_url}, ${s.signup_mode}, 0)
  `
  revalidatePath('/c/' + centro.slug)
  revalidatePath('/')
  redirect('/panel')
}

// ── 7. Cerrar turno ──────────────────────────────────────────────────────────

export async function cerrarTurno(shiftId: string): Promise<void> {
  const centro = await getCentroDeSession()
  await sql`UPDATE shifts SET status = 'closed' WHERE id = ${shiftId} AND center_id = ${centro.id}`
  revalidatePath('/c/' + centro.slug)
  redirect('/panel')
}

// ── 8. Eliminar turno ────────────────────────────────────────────────────────

export async function eliminarTurno(shiftId: string): Promise<void> {
  const centro = await getCentroDeSession()
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM signups
    WHERE shift_id = ${shiftId} AND state IN ('inscrito', 'confirmado')
  `
  if (count > 0) {
    redirect(
      '/panel?msg=' +
      encodeURIComponent(`No se puede eliminar: tiene ${count} inscripción(es) activa(s). Ciérralo en cambio.`),
    )
  }
  await sql`DELETE FROM shifts WHERE id = ${shiftId} AND center_id = ${centro.id}`
  revalidatePath('/c/' + centro.slug)
  revalidatePath('/')
  redirect('/panel')
}
