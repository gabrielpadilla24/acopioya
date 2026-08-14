import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

// Load .env.local since Next.js doesn't do it for plain Node scripts
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && !(key in process.env)) process.env[key] = val
  }
} catch {
  // .env.local may not exist in CI
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('Falta DATABASE_URL en .env.local')
  process.exit(1)
}

const sql = postgres(dbUrl, { prepare: false })

// ── helpers ─────────────────────────────────────────────────────────────────

function bogotaTimestamp(year: number, month: number, day: number, hour: number): Date {
  // Bogotá = UTC-5, sin horario de verano. Sumamos 5 h para obtener UTC.
  // Date.UTC normaliza desbordamientos de día/mes automáticamente.
  return new Date(Date.UTC(year, month - 1, day, hour + 5))
}

function bogotaToday(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).split('-').map(Number)
  return { y: parts[0], m: parts[1], d: parts[2] }
}

// ── data ─────────────────────────────────────────────────────────────────────

const { y, m, d } = bogotaToday()
// d+1 desborda correctamente en fin de mes porque Date.UTC normaliza.
const tomorrow = d + 1

const CENTERS = [
  {
    slug: 'demo-1',
    name: 'Centro de Acopio El Campín',
    address: 'Cra 30 #57-60',
    city: 'Bogotá',
    status: 'open',
    coordinator_name: 'Ana Ramírez',
    admin_token: 'tk_demo1',
    needs: [
      { category: 'agua',                           level: 'urgent' },
      { category: 'alimentos no perecederos',       level: 'needed' },
      { category: 'cobijas/colchonetas',            level: 'needed' },
      { category: 'aseo personal',                  level: 'enough' },
      { category: 'medicamentos/primeros auxilios', level: 'do_not_bring' },
    ],
    shifts: [
      { starts_at: bogotaTimestamp(y, m, d,        17), ends_at: bogotaTimestamp(y, m, d,        21), capacity: 20, overbook_pct: 20, role: 'recepcion' },
      { starts_at: bogotaTimestamp(y, m, tomorrow,  8), ends_at: bogotaTimestamp(y, m, tomorrow, 12), capacity: 15, overbook_pct:  0, role: 'clasificacion' },
      { starts_at: bogotaTimestamp(y, m, tomorrow, 13), ends_at: bogotaTimestamp(y, m, tomorrow, 17), capacity: 15, overbook_pct:  0, role: 'cargue' },
    ],
  },
  {
    slug: 'demo-2',
    name: 'Parroquia San Judas',
    address: 'Calle 45 #12-20',
    city: 'Bogotá',
    status: 'full',
    coordinator_name: 'Carlos Mejía',
    admin_token: 'tk_demo2',
    needs: [
      { category: 'pañales',                 level: 'urgent' },
      { category: 'alimento para mascotas',  level: 'needed' },
      { category: 'cajas/cinta de embalaje', level: 'needed' },
      { category: 'agua',                    level: 'enough' },
      { category: 'cobijas/colchonetas',     level: 'do_not_bring' },
    ],
    shifts: [
      { starts_at: bogotaTimestamp(y, m, d,        17), ends_at: bogotaTimestamp(y, m, d,        21), capacity: 20, overbook_pct: 20, role: 'profesional' },
      { starts_at: bogotaTimestamp(y, m, tomorrow,  8), ends_at: bogotaTimestamp(y, m, tomorrow, 12), capacity: 15, overbook_pct:  0, role: 'recepcion' },
      { starts_at: bogotaTimestamp(y, m, tomorrow, 13), ends_at: bogotaTimestamp(y, m, tomorrow, 17), capacity: 15, overbook_pct:  0, role: 'clasificacion' },
    ],
  },
] as const

// ── seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  for (const center of CENTERS) {
    const [row] = await sql<{ id: string; slug: string }[]>`
      INSERT INTO centers (slug, name, address, city, status, coordinator_name, admin_token)
      VALUES (${center.slug}, ${center.name}, ${center.address}, ${center.city},
              ${center.status}, ${center.coordinator_name}, ${center.admin_token})
      ON CONFLICT (slug) DO UPDATE SET
        name             = EXCLUDED.name,
        address          = EXCLUDED.address,
        city             = EXCLUDED.city,
        status           = EXCLUDED.status,
        coordinator_name = EXCLUDED.coordinator_name,
        admin_token      = EXCLUDED.admin_token
      RETURNING id, slug
    `
    const centerId: string = row.id
    console.log(`✔ center upserted: ${row.slug} (id=${centerId})`)

    // Replace needs for this center
    await sql`DELETE FROM needs WHERE center_id = ${centerId}`
    for (const n of center.needs) {
      await sql`
        INSERT INTO needs (center_id, category, level)
        VALUES (${centerId}, ${n.category}, ${n.level})
      `
      console.log(`  + need: ${n.level} → ${n.category}`)
    }

    // Replace shifts for this center
    await sql`DELETE FROM shifts WHERE center_id = ${centerId}`
    for (const s of center.shifts) {
      await sql`
        INSERT INTO shifts (center_id, starts_at, ends_at, capacity, overbook_pct, role, taken)
        VALUES (${centerId}, ${s.starts_at}, ${s.ends_at}, ${s.capacity}, ${s.overbook_pct}, ${s.role}, 0)
      `
      console.log(`  + shift: ${s.role} ${s.starts_at.toISOString()} – ${s.ends_at.toISOString()}`)
    }
  }

  await sql.end()
  console.log('\nSeed completado.')
}

seed().catch((err) => {
  console.error(err)
  sql.end().finally(() => process.exit(1))
})
