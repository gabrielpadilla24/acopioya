import { liberarCuposNoConfirmados } from '@/lib/liberar'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET no configurada en el entorno' }, { status: 500 })
  }

  if (request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const stats = await liberarCuposNoConfirmados()
  console.log('[cron] liberar-cupos:', stats)

  // modelo: 'directo-a-confirmado' → todos los signups nacen confirmados; esta
  // ruta retornará liberados:0 hasta que el modelo cambie o se migre la función.
  return Response.json({ ...stats, modelo: 'directo-a-confirmado' })
}
