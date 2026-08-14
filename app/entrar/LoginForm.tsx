'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div role="alert" className="p-3 bg-error-container border border-error rounded text-error text-sm font-medium">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="usuario" className="block text-sm font-medium text-on-surface mb-1">
          Usuario
        </label>
        <input
          id="usuario"
          name="usuario"
          type="text"
          required
          autoComplete="username"
          autoFocus
          className="w-full min-h-[44px] border border-outline-variant rounded px-3 py-2.5
                     text-on-surface bg-surface-container-lowest text-base
                     focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-on-surface mb-1">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
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
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
