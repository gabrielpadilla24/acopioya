'use client'

import { useActionState }             from 'react'
import { registrarLlegada, type CheckinState } from './actions'

export function FormCheckin({ slug, centerName }: { slug: string; centerName: string }) {
  const registrarConSlug             = registrarLlegada.bind(null, slug)
  const [state, formAction, pending] = useActionState<CheckinState, FormData>(registrarConSlug, null)

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (state?.status === 'success') {
    return (
      <div className="text-center px-6 py-10 space-y-4">
        <div className="text-7xl">✅</div>
        <h2 className="text-3xl font-black text-gray-950">¡Llegaste, {state.nombre}!</h2>
        <p className="text-2xl font-semibold text-gray-800">{state.rol}</p>
        <p className="text-xl text-gray-600">{state.horario}</p>
        {state.coordinador && (
          <p className="text-xl font-medium text-blue-800 mt-2">
            Repórtate con {state.coordinador}
          </p>
        )}
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <form action={formAction} className="px-6 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-950">
        Check-in · {centerName}
      </h1>

      {(state?.status === 'error' || state?.status === 'nomatch') && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-base font-medium ${
            state.status === 'nomatch'
              ? 'bg-amber-50 border border-amber-400 text-amber-900'
              : 'bg-red-50 border border-red-400 text-red-900'
          }`}
        >
          {state.message}
        </div>
      )}

      <input
        name="celular"
        type="tel"
        inputMode="tel"
        required
        autoFocus
        placeholder="3001234567"
        className="w-full min-h-[56px] text-2xl border-2 border-gray-300 rounded-xl px-4
                   focus:outline-none focus:border-blue-500"
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[56px] bg-blue-700 text-white text-xl font-black rounded-xl disabled:opacity-60"
      >
        {pending ? 'Buscando…' : 'Registrar llegada'}
      </button>
    </form>
  )
}
