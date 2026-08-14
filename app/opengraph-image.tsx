export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt         = 'AcopioYA — Centros de acopio'

import { ImageResponse } from 'next/og'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          backgroundColor: '#0f172a', // slate-900
          padding: '72px 88px',
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          AcopioYA
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#94a3b8', // slate-400
            marginTop: 28,
            fontWeight: 400,
            maxWidth: 820,
            lineHeight: 1.4,
          }}
        >
          Centros de acopio: qué llevar y dónde ayudar.
        </div>
      </div>
    ),
    { ...size },
  )
}
