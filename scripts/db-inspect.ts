import { readFileSync } from 'node:fs'
import { resolve }      from 'node:path'
import postgres          from 'postgres'
try {
  const ev = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const l of ev.split('\n')) {
    const i = l.indexOf('='); if (i > 0) {
      const k = l.slice(0,i).trim(), v = l.slice(i+1).trim()
      if (k && !(k in process.env)) process.env[k] = v
    }
  }
} catch {}
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
async function run() {
  console.log('=== centers columns ===')
  const cols = await sql`
    select column_name, data_type, is_nullable
      from information_schema.columns
     where table_name = 'centers' order by ordinal_position
  `
  cols.forEach(c => console.log(c.column_name, '|', c.data_type, '|', c.is_nullable))

  console.log('\n=== centers rows ===')
  const rows = await sql`
    select slug, name, is_active, left(admin_token, 8) || '…' as token_prefijo
      from centers order by created_at
  `
  rows.forEach(r => console.log(r.slug, '|', r.name, '|', r.is_active, '|', r.token_prefijo))

  console.log('\n=== inscripciones por centro ===')
  const ins = await sql`
    select c.slug, count(s.id) as inscripciones
      from centers c
      left join shifts sh on sh.center_id = c.id
      left join signups s on s.shift_id = sh.id
     group by c.slug order by 2 desc
  `
  ins.forEach(r => console.log(r.slug, '|', r.inscripciones))

  await sql.end()
}
run().catch(console.error)
