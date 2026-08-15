/**
 * Carga 19 centros de acopio adicionales de Bogotá.
 * Idempotente: ON CONFLICT (slug) DO UPDATE sin tocar admin_token.
 */
import { readFileSync } from 'node:fs'
import { resolve }      from 'node:path'
import postgres          from 'postgres'
import { normalizarSlug }    from '../lib/slug'
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

// ── Needs helpers ─────────────────────────────────────────────────────────────

type Need = { category: string; note?: string }

const CC_NEEDS: Need[] = [
  { category: 'Agua potable embotellada' },
  { category: 'Alimentos no perecederos' },
  { category: 'Cobijas y colchonetas' },
]

// ── Datos de los 19 centros ───────────────────────────────────────────────────

const CENTROS = [
  {
    name:          'Cruz Roja — SAMU Alquería (Sur)',
    address:       'Av. Carrera 68 #31-41 Sur',
    lat:           4.6068708,
    lng:           -74.130899,
    schedule_note: '8:00 a. m. – 6:00 p. m.',
    source:        'cruz_roja',
    phone:         '+57 601 7460909 ext. 911',
    needs: [
      { category: 'Agua potable embotellada' },
      { category: 'Alimentos no perecederos' },
      { category: 'Kits de albergue' },
      { category: 'Artículos de aseo' },
    ] as Need[],
  },
  {
    name:          'Uniagraria',
    address:       'Calle 170 #54A-10',
    lat:           4.7542802,
    lng:           -74.0533574,
    schedule_note: '8:00 a. m. – 5:00 p. m.',
    source:        'universidad',
    phone:         '+57 601 6671515',
    needs: [
      { category: 'Kits de higiene personal', note: 'Cepillos, jabón, máquinas de afeitar, pañales, protector solar' },
      { category: 'Cobijas, sábanas y colchonetas' },
      { category: 'Insumos para mascotas', note: 'Concentrado, alimento húmedo, medicamentos, guacales' },
    ] as Need[],
  },
  {
    name:          'Tienda Javeriana',
    address:       'Av. Carrera 7 #40-62',
    lat:           4.6284875,
    lng:           -74.0646645,
    schedule_note: 'Horario institucional de la universidad',
    source:        'universidad',
    phone:         '+57 601 3208320',
    needs: [
      { category: 'Alimentos no perecederos' },
      { category: 'Agua potable embotellada' },
      { category: 'Elementos de aseo' },
    ] as Need[],
  },
  {
    name:          'Banco de Alimentos de Bogotá',
    address:       'Calle 19A #32-50',
    lat:           4.6206931,
    lng:           -74.0893541,
    schedule_note: 'Lunes a viernes 7:00 a. m. – 5:00 p. m. · Sábados 7:00 a. m. – 12:30 p. m.',
    source:        'aliado',
    phone:         '+57 312 5037379',
    needs: [
      { category: 'Alimentos no perecederos' },
      { category: 'Agua potable embotellada' },
    ] as Need[],
  },
  {
    name:          'Fundación Catalina Muñoz',
    address:       'Diagonal 48 #19-16',
    lat:           4.6367406,
    lng:           -74.0717505,
    schedule_note: '9:00 a. m. – 5:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 5340260',
    needs: [
      { category: 'Alimentos no perecederos' },
      { category: 'Agua potable embotellada' },
      { category: 'Elementos de aseo' },
    ] as Need[],
  },
  {
    name:          'Compensar — CBI Carrera 60',
    address:       'Av. La Esmeralda #66B-05',
    lat:           4.6686986,
    lng:           -74.0843541,
    schedule_note: 'Lunes a sábado 6:00 a. m. – 9:00 p. m. · Domingos 6:00 a. m. – 7:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 3077001',
    needs: [
      { category: 'Alimentos no perecederos' },
      { category: 'Agua potable embotellada' },
      { category: 'Cobijas y colchonetas' },
      { category: 'Elementos de aseo' },
    ] as Need[],
  },
  {
    name:          'C.C. Plaza Imperial',
    address:       'Carrera 104 #148-07',
    lat:           4.7492822,
    lng:           -74.0952444,
    schedule_note: '8:00 a. m. – 10:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 6899445',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Parque La Colina',
    address:       'Carrera 58D #146-51',
    lat:           4.7326369,
    lng:           -74.0662106,
    schedule_note: 'Lunes a sábado 9:00 a. m. – 9:00 p. m. · Domingos 9:00 a. m. – 8:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 6013000',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Titán Plaza',
    address:       'Carrera 72 #80-94',
    lat:           4.694708,
    lng:           -74.086188,
    schedule_note: '8:00 a. m. – 9:00 p. m.',
    source:        'aliado',
    phone:         '+57 319 4502885',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Atlantis Plaza',
    address:       'Calle 81 #13-05',
    lat:           4.6662141,
    lng:           -74.0556109,
    schedule_note: '10:00 a. m. – 9:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 5803780',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Gran Estación',
    address:       'Av. Calle 26 #62-47',
    lat:           4.6473986,
    lng:           -74.1019189,
    schedule_note: '8:00 a. m. – 10:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 2210800',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Galerías',
    address:       'Calle 53B #25-21',
    lat:           4.641977,
    lng:           -74.0746415,
    schedule_note: '8:30 a. m. – 9:30 p. m.',
    source:        'aliado',
    phone:         '+57 601 3470419',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Multiplaza',
    address:       'Carrera 72 #17A-63',
    lat:           4.651397,
    lng:           -74.1262478,
    schedule_note: '8:00 a. m. – 9:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 3816865',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Plaza de las Américas',
    address:       'Carrera 71D #6-94',
    lat:           4.6188556,
    lng:           -74.1352285,
    schedule_note: '7:00 a. m. – 10:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 4467575',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Plaza Central',
    address:       'Carrera 65 #11-50',
    lat:           4.6321568,
    lng:           -74.1156238,
    schedule_note: '9:00 a. m. – 9:00 p. m.',
    source:        'aliado',
    phone:         '+57 318 4873739',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Nuestro Bogotá',
    address:       'Av. Ciudad de Cali #55A-75',
    lat:           4.684247,
    lng:           -74.1159052,
    schedule_note: 'Lunes a jueves 7:00 a. m. – 10:00 p. m. · Viernes y sábados 7:00 a. m. – 11:00 p. m. · Domingos 8:00 a. m. – 10:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 5803079',
    needs:         CC_NEEDS,
  },
  {
    name:          'Mallplaza NQS',
    address:       'Av. Carrera 30 con Calle 19',
    lat:           4.6180656,
    lng:           -74.0856553,
    schedule_note: '9:00 a. m. – 10:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 5877775',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Centro Mayor',
    address:       'Calle 38A Sur #34D-51',
    lat:           4.590252,
    lng:           -74.124033,
    schedule_note: '8:00 a. m. – 10:00 p. m.',
    source:        'aliado',
    phone:         '+57 601 7342048',
    needs:         CC_NEEDS,
  },
  {
    name:          'C.C. Paseo Villa del Río',
    address:       'Carrera 72M #47-21',
    lat:           4.5982497,
    lng:           -74.1527353,
    schedule_note: '7:00 a. m. – 9:00 p. m.',
    source:        'aliado',
    phone:         '+57 322 5647449',
    needs: [
      { category: 'Artículos de primera necesidad' },
    ] as Need[],
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
        lat, lng, schedule_note, whatsapp_contact, phone,
        admin_token, source, data_source_url,
        verified_at, verified_by
      )
      VALUES (
        ${slug}, ${c.name}, ${c.address}, 'Bogotá', 'open', true,
        ${c.lat}, ${c.lng}, ${c.schedule_note}, null, ${c.phone},
        ${token}, ${c.source}, null,
        now(), 'gabriel'
      )
      ON CONFLICT (slug) DO UPDATE SET
        name          = EXCLUDED.name,
        address       = EXCLUDED.address,
        city          = EXCLUDED.city,
        status        = EXCLUDED.status,
        is_active     = EXCLUDED.is_active,
        lat           = EXCLUDED.lat,
        lng           = EXCLUDED.lng,
        schedule_note = EXCLUDED.schedule_note,
        phone         = EXCLUDED.phone,
        source        = EXCLUDED.source,
        verified_at   = EXCLUDED.verified_at,
        verified_by   = EXCLUDED.verified_by,
        updated_at    = now()
      RETURNING id, slug
    `
    const centerId = row.id
    console.log(`✔ ${row.slug}  (id=${centerId})`)

    await sql`DELETE FROM needs WHERE center_id = ${centerId}`
    for (const need of c.needs) {
      await sql`
        INSERT INTO needs (center_id, category, level, note)
        VALUES (${centerId}, ${need.category}, 'needed', ${need.note ?? null})
      `
    }
    console.log(`  + ${c.needs.length} necesidades (needed)`)
  }

  await sql.end()
  console.log('\nCarga completada.')
}

cargar().catch(err => {
  console.error(err)
  sql.end().finally(() => process.exit(1))
})
