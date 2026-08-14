'use client'

import dynamic from 'next/dynamic'
import type { CentroMapa } from './Mapa'

const Mapa = dynamic(() => import('./Mapa'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-surface-container animate-pulse rounded-2xl" />
  ),
})

export default function MapaWrapper({ centros }: { centros: CentroMapa[] }) {
  return <Mapa centros={centros} />
}
