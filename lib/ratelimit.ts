// Rate limiter en memoria con ventana fija por clave.
// En serverless hay varias instancias y cada una tiene su propio Map →
// el límite es best-effort y no es global exacto. Suficiente para el MVP:
// disuade ataques simples sin necesidad de Redis.

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
