'use client'

import { useActionState } from 'react'
import { agregarWalkIn }  from './actions'

export function FormWalkIn({ shiftId }: { shiftId: string }) {
  const agregarBound                 = agregarWalkIn.bind(null, shiftId)
  const [state, formAction, pending] = useActionState(agregarBound, null)

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p role="alert" className="text-error text-sm bg-error-container border border-error rounded p-3">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">Nombre completo *</label>
        <input
          name="nombre"
          type="text"
          required
          minLength={2}
          autoComplete="off"
          placeholder="Nombre completo"
          className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">Celular *</label>
        <input
          name="celular"
          type="tel"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="3001234567"
          className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <p className="mt-1 text-xs text-on-surface-variant">Número colombiano de 10 dígitos</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[44px] bg-secondary text-on-primary font-bold rounded text-sm disabled:opacity-60"
      >
        {pending ? 'Agregando…' : '+ Agregar walk-in'}
      </button>
    </form>
  )
}
