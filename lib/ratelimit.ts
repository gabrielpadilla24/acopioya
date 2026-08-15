// Rate limiter en memoria con ventana fija por clave.
//
// LIMITACIÓN CONOCIDA: Vercel distribuye el tráfico entre varias instancias
// serverless y cada una tiene su propio Map independiente. Los contadores NO
// se comparten entre instancias — el límite es aproximado ("best-effort").
// Sirve para disuadir torpeza y bots básicos, NO contra un atacante decidido.
// Cuando se necesite un límite global exacto, reemplazar por Upstash Redis
// (misma interfaz, un cliente HTTP en lugar del Map).

type Bucket = { count: number; windowStart: number }

const _buckets = new Map<string, Bucket>()

export function limitar(clave: string, maxIntentos: number, ventanaMs: number): boolean {
  const ahora  = Date.now()
  const bucket = _buckets.get(clave)

  if (!bucket || ahora - bucket.windowStart >= ventanaMs) {
    _buckets.set(clave, { count: 1, windowStart: ahora })
    // Purgar entradas caducadas para no crecer sin límite
    if (_buckets.size > 10_000) {
      for (const [k, b] of _buckets) {
        if (ahora - b.windowStart >= ventanaMs) _buckets.delete(k)
      }
    }
    return true
  }

  if (bucket.count >= maxIntentos) return false
  bucket.count++
  return true
}
