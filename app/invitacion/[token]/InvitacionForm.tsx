'use client'

import { useActionState } from 'react'
import { aceptarInvitacion, type InvitacionState } from './actions'

export function InvitacionForm({ token }: { token: string }) {
  const accion = aceptarInvitacion.bind(null, token)
  const [state, formAction, pending] = useActionState<InvitacionState, FormData>(accion, null)

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-on-surface-variant">
        Define tu contraseña para activar el acceso. Mínimo 10 caracteres.
      </p>

      {state?.error && (
        <div role="alert" className="p-3 bg-error-container border border-error rounded text-error text-sm font-medium">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-on-surface mb-1">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          autoFocus
          className="w-full min-h-[44px] border border-outline-variant rounded px-3 py-2.5
                     text-on-surface bg-surface-container-lowest text-base
                     focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      <div>
        <label htmlFor="confirmacion" className="block text-sm font-medium text-on-surface mb-1">
          Confirmar contraseña
        </label>
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="w-full min-h-[44px] border border-outline-variant rounded px-3 py-2.5
                     text-on-surface bg-surface-container-lowest text-base
                     focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[48px] bg-primary text-on-primary font-bold rounded text-base
                   disabled:opacity-60 hover:bg-primary-container transition-colors"
      >
        {pending ? 'Activando…' : 'Activar acceso'}
      </button>
    </form>
  )
}
