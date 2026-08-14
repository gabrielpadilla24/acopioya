import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

function bogotaISO(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(new Date()).replace(' ', 'T') + '-05:00'
}

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB timeout')), 2000)
  })
  try {
    await Promise.race([sql`SELECT 1`, timeout])
    return Response.json({ ok: true, db: 'up', hora: bogotaISO() })
  } catch (err) {
    console.error('[health] DB check failed:', err instanceof Error ? err.message : err)
    return Response.json({ ok: false, db: 'down' }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}
