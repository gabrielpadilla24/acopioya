'use client'

import { useRouter }               from 'next/navigation'
import { useTransition, useState } from 'react'
import { contarAusentesAhora, liberarAusentesAhora } from './actions'

export function LiberarAhora({ shiftId }: { shiftId: string }) {
  const router                       = useRouter()
  const [isPending, startTransition] = useTransition()
  const [checking, setChecking]      = useState(false)
  const [resultado, setResultado]    = useState<string | null>(null)

  const isWorking = checking || isPending

  const handleClick = async () => {
    setResultado(null)
    setChecking(true)

    let count: number
    try {
      count = await contarAusentesAhora(shiftId)
    } finally {
      setChecking(false)
    }

    if (count === 0) {
      setResultado(
        'No hay cupos para liberar. Solo se pueden liberar cupos de turnos que empezaron hace más de 30 minutos.',
      )
      return
    }

    if (!window.confirm(
      `Hay ${count} persona(s) sin check-in en este turno. ¿Liberar sus cupos para que otros puedan tomarlos?`,
    )) return

    startTransition(async () => {
      const stats = await liberarAusentesAhora(shiftId)
      setResultado(
        stats && stats.liberados > 0
          ? `${stats.liberados} cupo(s) liberado(s).`
          : 'Sin cupos para liberar en este momento.',
      )
      router.refresh()
    })
  }

  return (
    <div>
      <button
        disabled={isWorking}
        onClick={() => { void handleClick() }}
        className="px-4 min-h-[44px] border border-outline-variant rounded text-sm font-medium text-on-surface hover:bg-surface-container bg-surface-container-lowest disabled:opacity-60"
      >
        {isWorking ? 'Verificando…' : 'Liberar cupos de ausentes'}
      </button>

      {resultado && (
        <p className="mt-2 text-sm text-on-surface-variant">{resultado}</p>
      )}
    </div>
  )
}
