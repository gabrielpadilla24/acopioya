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

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET no configurada en el entorno' }, { status: 500 })
  }

  if (request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const [{ borrados }] = await sql<{ borrados: number }[]>`
      WITH deleted AS (
        DELETE FROM signups
        WHERE created_at < now() - interval '90 days'
        RETURNING id
      )
      SELECT count(*)::int AS borrados FROM deleted
    `

    const ejecutado_en = bogotaISO()
    console.log('[cron] purgar-signups:', borrados, 'borrados')
    return Response.json({ borrados, ejecutado_en })
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err)
    return Response.json({ error: mensaje }, { status: 500 })
  }
}
