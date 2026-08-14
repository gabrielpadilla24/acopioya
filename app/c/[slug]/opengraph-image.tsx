export const revalidate = 300
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt         = 'Imagen del centro de acopio'

import { ImageResponse } from 'next/og'
import { obtenerCentroPorSlug } from '@/lib/queries'

const BG: Record<string, string> = {
  open:   '#14532d', // green-900
  full:   '#78350f', // amber-900
  closed: '#7f1d1d', // red-900
}

const ESTADO: Record<string, string> = {
  open:   'ABIERTO',
  full:   'LLENO',
  closed: 'CERRADO',
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const centro = await obtenerCentroPorSlug(slug)

  const bg      = BG[centro?.status ?? 'closed']
  const nombre  = centro?.name   ?? 'Centro de acopio'
  const ciudad  = centro?.city   ?? ''
  const estado  = ESTADO[centro?.status ?? 'closed']
  const urgentes = (centro?.needs ?? [])
    .filter(n => n.level === 'urgent')
    .slice(0, 3)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: bg,
          padding: '64px 72px',
        }}
      >
        {/* Nombre + ciudad/estado */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
              maxWidth: 1000,
              wordBreak: 'break-word',
            }}
          >
            {nombre}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 20,
              gap: 16,
            }}
          >
            <div style={{ fontSize: 32, color: '#d1fae5', fontWeight: 400 }}>
              {ciudad}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 8,
                padding: '4px 16px',
              }}
            >
              {estado}
            </div>
          </div>
        </div>

        {/* Necesidades urgentes */}
        {urgentes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {urgentes.map((n, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {/* Círculo rojo — sin emojis */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: 34, color: '#ffffff', fontWeight: 500 }}>
                  {n.category.charAt(0).toUpperCase() + n.category.slice(1)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 600,
            letterSpacing: 2,
          }}
        >
          AcopioYA
        </div>
      </div>
    ),
    { ...size },
  )
}
