'use server'

import { sql }              from '@/lib/db'
import { generarTokenAdmin } from '@/lib/tokens'
import { normalizarSlug, SLUGS_RESERVADOS } from '@/lib/slug'
import { revalidatePath }   from 'next/cache'

// ── TIPO COMPARTIDO ───────────────────────────────────────────────────────────

export type CentroFormState = {
  error?:   string
  success?: string
  warning?: string
  token?:   string   // solo en creación exitosa
  slug?:    string   // solo en creación exitosa
} | null

// ── REGENERAR TOKEN ──────────────────────────────────────────────────────────

async function doGenerarToken(centerId: string): Promise<string> {
  const token = generarTokenAdmin()
  const rows = await sql<{ id: string }[]>`
    UPDATE centers
    SET admin_token = ${token}, updated_at = now()
    WHERE id = ${centerId}
    RETURNING id
  `
  if (rows.length === 0) throw new Error('Centro no encontrado')
  return token
}

export async function regenerarToken(
  centerId: string,
  prevState: { token?: string; error?: string } | null,
  _formData: FormData,
): Promise<{ token?: string; error?: string }> {
  try {
    let nuevoToken: string
    try {
      nuevoToken = await doGenerarToken(centerId)
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === '23505') {
        nuevoToken = await doGenerarToken(centerId)
      } else {
        throw e
      }
    }
    return { token: nuevoToken }
  } catch {
    return { error: 'No se pudo regenerar el token. Intenta de nuevo.' }
  }
}

// ── HELPERS DE COORDENADAS ────────────────────────────────────────────────────

function parseCoordenadas(raw: string): { lat: number | null; lng: number | null; error?: string } {
  if (!raw.trim()) return { lat: null, lng: null }
  const parts = raw.split(',').map(s => parseFloat(s.trim()))
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return { lat: null, lng: null, error: 'Formato inválido. Usa "lat, lng" como "4.6512, -74.0561".' }
  }
  return { lat: parts[0], lng: parts[1] }
}

function advertenciaCoordenadas(lat: number, lng: number): string | undefined {
  if (lat < 3.9 || lat > 5.1 || lng < -74.5 || lng > -73.9) {
    return `Coordenadas (${lat}, ${lng}) fuera del área esperada de Bogotá. Se guardaron de todas formas.`
  }
}

// ── CREAR CENTRO ─────────────────────────────────────────────────────────────

export async function crearCentro(
  prevState: CentroFormState,
  formData: FormData,
): Promise<CentroFormState> {
  const nombre       = (formData.get('nombre')           as string | null)?.trim() ?? ''
  const slugRaw      = (formData.get('slug')             as string | null)?.trim() ?? ''
  const direccion    = (formData.get('direccion')        as string | null)?.trim() ?? ''
  const ciudad       = (formData.get('ciudad')           as string | null)?.trim() || 'Bogotá'
  const coordsRaw    = (formData.get('coords')           as string | null)?.trim() ?? ''
  const status       = (formData.get('status')           as string | null)?.trim() || 'open'
  const whatsapp     = (formData.get('whatsapp_contact') as string | null)?.trim() || null
  const coordinador  = (formData.get('coordinator_name') as string | null)?.trim() || null
  const scheduleNote = (formData.get('schedule_note')    as string | null)?.trim() || null

  if (!nombre || !direccion) {
    return { error: 'Nombre y dirección son obligatorios.' }
  }

  const slugBase = normalizarSlug(slugRaw || nombre)
  if (!slugBase) {
    return { error: 'El slug resultante está vacío. Usa letras y números.' }
  }
  if (SLUGS_RESERVADOS.has(slugBase)) {
    return { error: `"${slugBase}" es una ruta reservada del sistema y no puede usarse como slug.` }
  }

  // Resolver colisiones: -2, -3, …
  let slug = slugBase
  let n = 2
  for (;;) {
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM centers WHERE slug = ${slug} LIMIT 1
    `
    if (!existing) break
    slug = `${slugBase}-${n++}`
  }

  // Coordenadas
  const coords = parseCoordenadas(coordsRaw)
  if (coords.error) return { error: coords.error }
  const { lat, lng } = coords

  const warning = lat !== null && lng !== null
    ? advertenciaCoordenadas(lat, lng)
    : undefined

  const token = generarTokenAdmin()

  try {
    await sql`
      INSERT INTO centers (
        slug, name, address, city, lat, lng, status,
        admin_token, whatsapp_contact, coordinator_name, schedule_note,
        is_active, verified_at, verified_by
      ) VALUES (
        ${slug}, ${nombre}, ${direccion}, ${ciudad},
        ${lat}, ${lng}, ${status}::center_status,
        ${token}, ${whatsapp}, ${coordinador}, ${scheduleNote},
        true, now(), 'admin'
      )
    `
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === '23505') {
      return { error: 'El slug ya está en uso. Edítalo e inténtalo de nuevo.' }
    }
    return { error: 'Error al crear el centro. Intenta de nuevo.' }
  }

  revalidatePath('/')
  revalidatePath('/c/' + slug)

  return { token, slug, warning }
}

// ── ACTUALIZAR CENTRO ────────────────────────────────────────────────────────

export async function actualizarCentro(
  centerId: string,
  prevState: CentroFormState,
  formData: FormData,
): Promise<CentroFormState> {
  const nombre       = (formData.get('nombre')           as string | null)?.trim() ?? ''
  const ciudad       = (formData.get('ciudad')           as string | null)?.trim() ?? ''
  const direccion    = (formData.get('direccion')        as string | null)?.trim() ?? ''
  const slugRaw      = (formData.get('slug')             as string | null)?.trim() ?? ''
  const coordsRaw    = (formData.get('coords')           as string | null)?.trim() ?? ''
  const status       = (formData.get('status')           as string | null)?.trim() || 'open'
  const whatsapp     = (formData.get('whatsapp_contact') as string | null)?.trim() || null
  const coordinador  = (formData.get('coordinator_name') as string | null)?.trim() || null
  const scheduleNote = (formData.get('schedule_note')    as string | null)?.trim() || null

  if (!nombre || !ciudad || !direccion || !slugRaw) {
    return { error: 'Nombre, ciudad, dirección y slug son obligatorios.' }
  }

  const slugNuevo = normalizarSlug(slugRaw)
  if (!slugNuevo) {
    return { error: 'El slug resultante está vacío. Usa letras y números.' }
  }
  if (SLUGS_RESERVADOS.has(slugNuevo)) {
    return { error: `"${slugNuevo}" es una ruta reservada del sistema y no puede usarse como slug.` }
  }

  // Coordenadas
  const coords = parseCoordenadas(coordsRaw)
  if (coords.error) return { error: coords.error }
  const { lat, lng } = coords

  const warning = lat !== null && lng !== null
    ? advertenciaCoordenadas(lat, lng)
    : undefined

  const [actual] = await sql<{ slug: string }[]>`
    SELECT slug FROM centers WHERE id = ${centerId} LIMIT 1
  `
  if (!actual) return { error: 'Centro no encontrado.' }

  const slugViejo     = actual.slug
  const cambiandoSlug = slugNuevo !== slugViejo

  // Protección: no cambiar slug si ya hay inscritos
  if (cambiandoSlug) {
    const [{ total }] = await sql<{ total: number }[]>`
      SELECT COUNT(s.id)::int AS total
      FROM signups s
      JOIN shifts sh ON sh.id = s.shift_id
      WHERE sh.center_id = ${centerId}
    `
    if (total >= 1) {
      return {
        error:
          'No se puede cambiar el link de un centro que ya tiene inscritos. ' +
          'El código QR impreso y la tarjeta de WhatsApp dejarían de funcionar.',
      }
    }
  }

  try {
    await sql.begin(async (tx) => {
      if (cambiandoSlug) {
        await tx`
          INSERT INTO center_slug_aliases (center_id, slug)
          VALUES (${centerId}, ${slugViejo})
          ON CONFLICT (slug) DO NOTHING
        `
      }
      await tx`
        UPDATE centers SET
          name             = ${nombre},
          city             = ${ciudad},
          address          = ${direccion},
          slug             = ${slugNuevo},
          lat              = ${lat},
          lng              = ${lng},
          status           = ${status}::center_status,
          whatsapp_contact = ${whatsapp},
          coordinator_name = ${coordinador},
          schedule_note    = ${scheduleNote},
          verified_at      = now(),
          updated_at       = now()
        WHERE id = ${centerId}
      `
    })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === '23505') {
      return { error: 'Ese slug ya está en uso por otro centro. Elige uno diferente.' }
    }
    return { error: 'Error al actualizar el centro. Intenta de nuevo.' }
  }

  revalidatePath('/')
  revalidatePath('/c/' + slugNuevo)
  if (cambiandoSlug) revalidatePath('/c/' + slugViejo)

  return { success: 'Centro actualizado correctamente.', warning }
}

// ── ALTERNAR ACTIVO ───────────────────────────────────────────────────────────

export async function alternarActivo(
  centerId: string,
  _formData: FormData,
): Promise<void> {
  const [row] = await sql<{ slug: string }[]>`
    UPDATE centers
    SET is_active = NOT is_active, updated_at = now()
    WHERE id = ${centerId}
    RETURNING slug
  `
  if (!row) return
  revalidatePath('/')
  revalidatePath('/c/' + row.slug)
}
