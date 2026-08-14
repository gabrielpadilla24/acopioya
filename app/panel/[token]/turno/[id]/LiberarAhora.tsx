'use client'

import { useRouter }          from 'next/navigation'
import { useTransition, useState } from 'react'
import { liberarAhora }       from './actions'

export function LiberarAhora({ token, shiftId }: { token: string; shiftId: string }) {
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
              const stats = await liberarAhora(token, shiftId)
              if (stats !== null) {
                setResultado(
                  stats.liberados > 0
                    ? `✅ ${stats.liberados} cupo(s) liberado(s).`
                    : 'Sin cupos para liberar (todos confirmaron o fuera de la ventana T-2h a T).',
                )
              }
              router.refresh()
            })
          }
        }}
        className="px-4 min-h-[44px] border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white disabled:opacity-60"
      >
        {isPending ? 'Liberando…' : '🔓 Liberar no confirmados ahora'}
      </button>

      {resultado && (
        <p className="mt-2 text-sm text-green-700 font-medium">{resultado}</p>
      )}
    </div>
  )
}
