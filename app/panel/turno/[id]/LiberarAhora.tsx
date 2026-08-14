'use client'

import { useRouter }               from 'next/navigation'
import { useTransition, useState } from 'react'
import { liberarAhora }            from './actions'

export function LiberarAhora({ shiftId }: { shiftId: string }) {
  const router                       = useRouter()
  const [isPending, startTransition] = useTransition()
  const [resultado, setResultado]    = useState<string | null>(null)

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => {
          if (window.confirm('¿Liberar cupos no confirmados de este turno?')) {
            startTransition(async () => {
              const stats = await liberarAhora(shiftId)
              if (stats !== null) {
                setResultado(
                  stats.liberados > 0
                    ? `✓ ${stats.liberados} cupo(s) liberado(s).`
                    : 'Sin cupos para liberar (todos confirmaron o fuera de la ventana T-2h a T).',
                )
              }
              router.refresh()
            })
          }
        }}
        className="px-4 min-h-[44px] border border-outline-variant rounded text-sm font-medium text-on-surface hover:bg-surface-container bg-surface-container-lowest disabled:opacity-60"
      >
        {isPending ? 'Liberando…' : 'Liberar no confirmados ahora'}
      </button>

      {resultado && (
        <p className="mt-2 text-sm text-on-tertiary-container font-medium">{resultado}</p>
      )}
    </div>
  )
}
