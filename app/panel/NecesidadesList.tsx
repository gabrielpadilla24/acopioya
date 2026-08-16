'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { useFormStatus }                           from 'react-dom'

type NeedLevel = 'urgent' | 'needed' | 'enough' | 'do_not_bring'

type Need = {
  id:       string
  category: string
  level:    NeedLevel
}

type NeedUpdate =
  | { type: 'remove'; id: string }
  | { type: 'level';  id: string; nivel: NeedLevel }

const NIVEL_UI: Record<NeedLevel, { label: string; activeCls: string }> = {
  urgent:       { label: 'Urgente',        activeCls: 'bg-primary text-on-primary' },
  needed:       { label: 'Se necesita',    activeCls: 'bg-warning text-on-primary' },
  enough:       { label: 'Suficiente',     activeCls: 'bg-tertiary text-on-tertiary' },
  do_not_bring: { label: 'No se necesita', activeCls: 'bg-on-surface text-surface-container-lowest' },
}

const NIVELES: NeedLevel[] = ['urgent', 'needed', 'enough', 'do_not_bring']

function Spinner() {
  return (
    <span
      className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    />
  )
}

function SubmitAgregar() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 min-h-[44px] bg-secondary text-on-primary text-sm font-bold rounded whitespace-nowrap disabled:opacity-60"
    >
      {pending ? 'Guardando…' : 'Agregar'}
    </button>
  )
}

export function NecesidadesList({
  needs: initialNeeds,
  categoriasDisponibles,
  cambiarNivel,
  eliminar,
  agregar,
}: {
  needs:                 Need[]
  categoriasDisponibles: string[]
  cambiarNivel:          (needId: string, nivel: string, formData: FormData) => Promise<void>
  eliminar:              (needId: string) => Promise<void>
  agregar:               (formData: FormData) => Promise<void>
}) {
  const [optimisticNeeds, updateNeeds] = useOptimistic(
    initialNeeds,
    (current: Need[], update: NeedUpdate) => {
      if (update.type === 'remove') return current.filter(n => n.id !== update.id)
      if (update.type === 'level')  return current.map(n =>
        n.id === update.id ? { ...n, level: update.nivel } : n,
      )
      return current
    },
  )
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleNivel = (needId: string, nivel: NeedLevel) => {
    if (isPending) return
    setError(null)
    startTransition(async () => {
      updateNeeds({ type: 'level', id: needId, nivel })
      try {
        await cambiarNivel(needId, nivel, new FormData())
      } catch (e) {
        if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e
        console.error(e)
        setError('No se pudo guardar. Intenta de nuevo.')
      }
    })
  }

  const handleEliminar = (need: Need) => {
    if (!window.confirm(`¿Eliminar "${need.category}" de la lista?`)) return
    if (isPending) return
    setError(null)
    startTransition(async () => {
      updateNeeds({ type: 'remove', id: need.id })
      try {
        await eliminar(need.id)
      } catch (e) {
        if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e
        console.error(e)
        setError('No se pudo eliminar. Intenta de nuevo.')
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-xs text-error bg-error-container border border-error rounded px-3 py-2">
          {error}
        </p>
      )}

      {optimisticNeeds.length === 0 && (
        <p className="text-sm text-on-surface-variant">No hay categorías añadidas aún.</p>
      )}

      {optimisticNeeds.map(need => (
        <div key={need.id} className="border border-outline-variant rounded p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-on-surface capitalize">{need.category}</span>
            <button
              type="button"
              disabled={isPending}
              aria-label={`Eliminar ${need.category} de la lista de necesidades`}
              onClick={() => handleEliminar(need)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded border border-outline-variant text-xs text-on-surface-variant hover:bg-error-container hover:text-error hover:border-error disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Quitar
            </button>
          </div>

          {/* Segmento de nivel — 2×2 en móvil, 1×4 en sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-outline-variant rounded overflow-hidden">
            {NIVELES.map(nivel => {
              const { label, activeCls } = NIVEL_UI[nivel]
              const isActive = need.level === nivel
              const spinning = isPending && isActive

              return (
                <button
                  key={nivel}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleNivel(need.id, nivel)}
                  className={`w-full min-h-[44px] px-1 py-2 text-xs font-medium leading-tight text-center transition-colors flex items-center justify-center disabled:cursor-not-allowed ${
                    isActive
                      ? activeCls
                      : 'bg-surface-container-lowest text-on-surface-variant'
                  }`}
                >
                  {spinning ? <Spinner /> : label}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <form action={agregar} className="mt-4 flex gap-2">
        <input
          name="categoria"
          list="cats-lista"
          required
          placeholder="Nueva categoría…"
          className="flex-1 min-h-[44px] border border-outline-variant rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <datalist id="cats-lista">
          {categoriasDisponibles.map(c => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <SubmitAgregar />
      </form>
    </div>
  )
}
