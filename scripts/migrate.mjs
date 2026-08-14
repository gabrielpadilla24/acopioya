// Aplica un archivo SQL contra DATABASE_URL de .env.local
// Uso: node scripts/migrate.mjs migrations/003_auth.sql
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

// Cargar .env.local manualmente
const envPath = resolve(root, '.env.local')
const envText = readFileSync(envPath, 'utf8')
for (const line of envText.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  process.env[key] = val
}

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL no encontrada en .env.local')

const require = createRequire(import.meta.url)
const postgres = require('postgres')
const sql = postgres(url, { prepare: false })

const file = process.argv[2]
if (!file) throw new Error('Pasa la ruta del SQL como argumento')
const sqlText = readFileSync(resolve(process.cwd(), file), 'utf8')

console.log(`Aplicando ${file}…`)
await sql.unsafe(sqlText)
console.log('OK')
await sql.end()
