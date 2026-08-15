/**
 * Carga los 14 centros de acopio reales de Bogotá.
 * Idempotente: usa ON CONFLICT (slug) DO UPDATE para actualizar campos sin tocar admin_token.
 */
import { readFileSync } from 'node:fs'
import { resolve }      from 'node:path'
import postgres          from 'postgres'
import { normalizarSlug } from '../lib/slug'
import { generarTokenAdmin } from '../lib/tokens'

try {
  const ef = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of ef.split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('='); if (eq < 0) continue
    const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim()
    if (k && !(k in process.env)) process.env[k] = v
  }
} catch { /* .env.local opcional */ }

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('Falta DATABASE_URL en .env.local'); process.exit(1) }

const sql = postgres(dbUrl, { prepare: false })

// ── Constantes ────────────────────────────────────────────────────────────────

const URL_DISTRITAL = 'https://bogota.gov.co/mi-ciudad/seguridad/puntos-de-donacion-en-bogota-para-damnificados-terremoto-en-colombia'

const NEEDS_GENERALES = [
  'Agua potable embotellada',
  'Alimentos no perecederos',
  'Elementos de higiene personal',
  'Primeros auxilios',
  'Cobijas y colchonetas',
]

const NEEDS_IDPYBA = [
  'Alimento para perros y gatos',
  'Arena para gatos',
  'Medicamentos veterinarios',
  'Collares, correas y platos',
]

// ── Datos de los 14 centros ───────────────────────────────────────────────────

const CENTROS = [
  {
    name:            'Universidad Jorge Tadeo Lozano',
    address:         'Cra. 4 #22-61',
    lat:             4.606567,
    lng:             -74.067801,
    schedule_note:   '8:00 a. m. – 9:00 p. m., todos los días',
    source:          'oficial_distrital',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: null as string | null,
    whatsapp_contact: null as string | null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Punto de acopio Usaquén',
    address:         'Cl. 161A #7F-55',
    lat:             4.737165,
    lng:             -74.025936,
    schedule_note:   '8:00 a. m. – 9:00 p. m., todos los días. Recibe voluntarios',
    source:          'oficial_distrital',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Centro Comercial Unicentro',
    address:         'Ak. 15 #124-30',
    lat:             4.7034551,
    lng:             -74.0421938,
    schedule_note:   '9:00 a. m. – 5:00 p. m.',
    source:          'oficial_distrital',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Cruz Roja — sede administrativa',
    address:         'Cra. 24 #73-38',
    lat:             4.6640413,
    lng:             -74.0662193,
    schedule_note:   'Abierto 24 horas. Voluntariado prioritario',
    source:          'cruz_roja',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Estadio Nemesio Camacho El Campín',
    address:         'Cra. 30 entre Cl. 53B Bis y Cl. 57. Punto de recepción sobre la carrera 30, cerca del puente peatonal',
    lat:             4.645942,
    lng:             -74.0775185,
    schedule_note:   '8:00 a. m. – 9:00 p. m. Operado por Sencia con la Cruz Roja. Voluntariado: WhatsApp 310 785 9941',
    source:          'oficial_distrital',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: null,
    whatsapp_contact: '+573107859941',
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Palacio de los Deportes',
    address:         'Ac. 63 #59A-06',
    lat:             4.6554178,
    lng:             -74.0841157,
    schedule_note:   '8:00 a. m. – 8:00 p. m. Ayudas con destino a Chocó',
    source:          'oficial_distrital',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Cruz Roja — SAMU Norte',
    address:         'Cra. 7B Bis #132-31',
    lat:             4.7109011,
    lng:             -74.0302357,
    schedule_note:   '8:00 a. m. – 9:00 p. m.',
    source:          'cruz_roja',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Centro de Salvamento Acuático — Cruz Roja',
    address:         'Av. La Esmeralda #63-81',
    lat:             4.66615,
    lng:             -74.0860427,
    schedule_note:   '8:00 a. m. – 9:00 p. m.',
    source:          'cruz_roja',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Pabellón Vive Claro',
    address:         'Av. La Esmeralda #42-41. Voluntarios ingresan por la Puerta 10; vehículos particulares por la Puerta Vehicular 2',
    lat:             4.6493373,
    lng:             -74.0972212,
    schedule_note:   '8:00 a. m. – 5:00 p. m. Centro nacional de acopio. Voluntarios desde 16 años, sin mascotas',
    source:          'oficial_distrital',
    data_source_url: URL_DISTRITAL,
    recepcion_hasta: '2026-08-31' as string | null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Fundación Universitaria Juan N. Corpas',
    address:         'Cra. 111 #159A-61',
    lat:             4.7612317,
    lng:             -74.0923431,
    schedule_note:   'Hasta las 2:00 p. m.',
    source:          'universidad',
    data_source_url: null as string | null,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Universidad Católica de Colombia',
    address:         'Dg. 46A #15B-12. Entrega en el salón 108 del claustro o en la casa de bienestar',
    lat:             4.6346041,
    lng:             -74.0687007,
    schedule_note:   'Consultar en portería',
    source:          'universidad',
    data_source_url: null,
    recepcion_hasta: '2026-08-19',
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'Fundación Universitaria Horizonte',
    address:         'Cl. 69 #14-30. Entrega en el hall principal',
    lat:             4.656154,
    lng:             -74.0631693,
    schedule_note:   'Consultar en portería. NO recibe ropa',
    source:          'universidad',
    data_source_url: null,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
  {
    name:            'IDPYBA — donaciones para animales',
    address:         'Corferias, arco de la entrada principal, Cra. 37 #24-67',
    lat:             4.6291803,
    lng:             -74.0899575,
    schedule_note:   '10:00 a. m. – 6:00 p. m. Solo insumos para animales',
    source:          'aliado',
    data_source_url: null,
    recepcion_hasta: '2026-08-17',
    whatsapp_contact: null,
    needs:           NEEDS_IDPYBA,
  },
  {
    name:            'Banco de Alimentos — punto Teusaquillo',
    address:         'Cra. 19 #43A-25',
    lat:             4.6324361,
    lng:             -74.0722105,
    schedule_note:   'Lunes a sábado, 11:00 a. m. – 8:00 p. m.',
    source:          'aliado',
    data_source_url: null,
    recepcion_hasta: null,
    whatsapp_contact: null,
    needs:           NEEDS_GENERALES,
  },
]

// ── Resolución de slug con colisiones ─────────────────────────────────────────

async function resolverSlug(base: string): Promise<string> {
  const existentes = await sql<{ slug: string }[]>`
    SELECT slug FROM centers WHERE slug LIKE ${base + '%'}
  `
  const slugsExistentes = new Set(existentes.map(r => r.slug))
  if (!slugsExistentes.has(base)) return base
  for (let i = 2; i < 100; i++) {
    const candidato = `${base}-${i}`
    if (!slugsExistentes.has(candidato)) return candidato
  }
  throw new Error(`No se pudo resolver slug para base "${base}"`)
}

// ── Carga ─────────────────────────────────────────────────────────────────────

async function cargar() {
  console.log(`\nCargando ${CENTROS.length} centros...\n`)

  for (const c of CENTROS) {
    const baseSlug = normalizarSlug(c.name)
    const slug     = await resolverSlug(baseSlug)
    const token    = generarTokenAdmin()

    const [row] = await sql<{ id: string; slug: string }[]>`
      INSERT INTO centers (
        slug, name, address, city, status, is_active,
        lat, lng, schedule_note, whatsapp_contact,
        admin_token, source, data_source_url, recepcion_hasta,
        verified_at, verified_by
      )
      VALUES (
        ${slug}, ${c.name}, ${c.address}, 'Bogotá', 'open', true,
        ${c.lat}, ${c.lng}, ${c.schedule_note}, ${c.whatsapp_contact},
        ${token}, ${c.source}, ${c.data_source_url}, ${c.recepcion_hasta},
        now(), 'gabriel'
      )
      ON CONFLICT (slug) DO UPDATE SET
        name             = EXCLUDED.name,
        address          = EXCLUDED.address,
        city             = EXCLUDED.city,
        status           = EXCLUDED.status,
        is_active        = EXCLUDED.is_active,
        lat              = EXCLUDED.lat,
        lng              = EXCLUDED.lng,
        schedule_note    = EXCLUDED.schedule_note,
        whatsapp_contact = EXCLUDED.whatsapp_contact,
        source           = EXCLUDED.source,
        data_source_url  = EXCLUDED.data_source_url,
        recepcion_hasta  = EXCLUDED.recepcion_hasta,
        verified_at      = EXCLUDED.verified_at,
        verified_by      = EXCLUDED.verified_by,
        updated_at       = now()
      RETURNING id, slug
    `
    const centerId = row.id
    console.log(`✔ ${row.slug}  (id=${centerId})`)

    await sql`DELETE FROM needs WHERE center_id = ${centerId}`
    for (const category of c.needs) {
      await sql`
        INSERT INTO needs (center_id, category, level)
        VALUES (${centerId}, ${category}, 'needed')
      `
    }
    console.log(`  + ${c.needs.length} necesidades (needed)`)
  }

  // Nota sobre data_source_url pendiente
  console.log('\n⚠ data_source_url = null en centros con source "universidad" y "aliado".')
  console.log('  Pendiente confirmar URL oficial para cada uno.\n')

  await sql.end()
  console.log('Carga completada.')
}

cargar().catch(err => {
  console.error(err)
  sql.end().finally(() => process.exit(1))
})
