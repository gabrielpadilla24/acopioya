'use client'

import { useActionState } from 'react'
import { agregarWalkIn }  from './actions'

export function FormWalkIn({ token, shiftId }: { token: string; shiftId: string }) {
  const agregarBound                 = agregarWalkIn.bind(null, token, shiftId)
  const [state, formAction, pending] = useActionState(agregarBound, null)

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p role="alert" className="text-red-800 text-sm bg-red-50 border border-red-300 rounded-lg p-3">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nombre completo *</label>
        <input
          name="nombre"
          type="text"
          required
          minLength={2}
          autoComplete="off"
          placeholder="Nombre completo"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Celular *</label>
        <input
          name="celular"
          type="tel"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="3001234567"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Número colombiano de 10 dígitos</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[44px] bg-gray-900 text-white font-bold rounded-xl text-sm disabled:opacity-60"
      >
        {pending ? 'Agregando…' : '+ Agregar walk-in'}
      </button>
    </form>
  )
}
