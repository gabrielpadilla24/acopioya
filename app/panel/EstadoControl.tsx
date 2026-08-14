'use client'

import { useOptimistic, useTransition, useState } from 'react'

type Status = 'open' | 'full' | 'closed'

const STATUS_UI: Record<Status, { label: string; activeCls: string }> = {
  open:   { label: 'Abierto',  activeCls: 'bg-tertiary text-on-tertiary font-bold' },
  full:   { label: 'Lleno',    activeCls: 'bg-warning text-on-primary font-bold' },
  closed: { label: 'Cerrado',  activeCls: 'bg-primary text-on-primary font-bold' },
}

function Spinner() {
  return (
    <span
      className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    />
  )
}

export function EstadoControl({
  status,
  cambiar,
}: {
  status:  Status
  cambiar: (estado: string, formData: FormData) => Promise<void>
}) {
  const [optimisticStatus, addOptimisticStatus] = useOptimistic(
    status,
    (_: Status, next: Status) => next,
  )
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleClick = (estado: Status) => {
    if (isPending) return
    setError(null)
    startTransition(async () => {
      addOptimisticStatus(estado)
      try {
        await cambiar(estado, new FormData())
      } catch {
        setError('No se pudo guardar. Intenta de nuevo.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(['open', 'full', 'closed'] as const).map(estado => {
          const ui       = STATUS_UI[estado]
          const isActive = optimisticStatus === estado
          const spinning = isPending && isActive

          return (
            <button
              key={estado}
              type="button"
              disabled={isPending}
              onClick={() => handleClick(estado)}
              aria-label={`Marcar centro como ${ui.label}`}
              className={`flex-1 min-h-[52px] rounded text-sm transition-colors flex items-center justify-center disabled:cursor-not-allowed ${
                isActive
                  ? ui.activeCls
                  : 'bg-surface-container text-on-surface-variant border border-outline-variant'
              }`}
            >
              {spinning ? <Spinner /> : ui.label}
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs text-error bg-error-container border border-error rounded px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
