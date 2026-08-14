import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

export function proxy(request: NextRequest) {
  const envPass = process.env.ADMIN_PASSWORD
  if (!envPass) {
    return new NextResponse('Servicio no disponible', { status: 503 })
  }

  const auth = request.headers.get('authorization') ?? ''
  let authed = false

  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8')
    const sep = decoded.indexOf(':')
    if (sep !== -1) {
      const password = decoded.slice(sep + 1)
      authed = timingSafeEqual(sha256(password), sha256(envPass))
    }
  }

  if (!authed) {
    return new NextResponse('Autenticación requerida', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="AcopioYA Admin"',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
      },
    })
  }

  const res = NextResponse.next()
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
