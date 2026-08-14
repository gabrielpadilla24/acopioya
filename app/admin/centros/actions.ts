'use server'

import { sql } from '@/lib/db'
import { generarTokenAdmin } from '@/lib/tokens'
import { revalidatePath } from 'next/cache'

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

// ── ACTUALIZAR CENTRO ────────────────────────────────────────────────────────

const SLUGS_RESERVADOS = new Set([
  'admin', 'panel', 'checkin', 'v', 'api', 'privacidad',
  'health', '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml',
])

function normalizarSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function actualizarCentro(
  centerId: string,
  prevState: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const nombre    = (formData.get('nombre')           as string | null)?.trim() ?? ''
  const ciudad    = (formData.get('ciudad')           as string | null)?.trim() ?? ''
  const direccion = (formData.get('direccion')        as string | null)?.trim() ?? ''
  const slugRaw   = (formData.get('slug')             as string | null)?.trim() ?? ''
  const coord     = (formData.get('coordinator_name') as string | null)?.trim() || null

  if (!nombre || !ciudad || !direccion || !slugRaw) {
    return { error: 'Nombre, ciudad, dirección y slug son obligatorios.' }
  }

  const slugNuevo = normalizarSlug(slugRaw)
  if (!slugNuevo) {
    return { error: 'El slug resultante está vacío. Usa letras y números.' }
  }
  if (SLUGS_RESERVADOS.has(slugNuevo)) {
    return {
      error: `"${slugNuevo}" es una ruta reservada del sistema y no puede usarse como slug.`,
    }
  }

  const [actual] = await sql<{ slug: string }[]>`
    SELECT slug FROM centers WHERE id = ${centerId} LIMIT 1
  `
  if (!actual) return { error: 'Centro no encontrado.' }

  const slugViejo     = actual.slug
  const cambiandoSlug = slugNuevo !== slugViejo

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
          coordinator_name = ${coord},
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

  return { success: 'Centro actualizado correctamente.' }
}
