'use client'

import { useActionState } from 'react'
import { inscribir, type ActionState } from './actions'

export default function FormInscripcion({ slug, shiftId }: { slug: string; shiftId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(inscribir, null)

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="slug"     value={slug}    />
      <input type="hidden" name="shift_id" value={shiftId} />

      {/* Honeypot — hidden from humans, bots fill it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
      />

      {state?.error && (
        <div role="alert" className="p-3 bg-error-container border border-error rounded text-error text-sm font-medium">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-on-surface mb-1">
          Nombre completo
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          className="w-full border border-outline-variant rounded px-3 py-2.5 text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest"
          placeholder="Tu nombre completo"
        />
      </div>

      <div>
        <label htmlFor="celular" className="block text-sm font-medium text-on-surface mb-1">
          Número de celular
        </label>
        <input
          id="celular"
          name="celular"
          type="tel"
          required
          inputMode="numeric"
          autoComplete="tel"
          className="w-full border border-outline-variant rounded px-3 py-2.5 text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest"
          placeholder="3001234567"
        />
        <p className="mt-1 text-xs text-on-surface-variant">Número colombiano, 10 dígitos, empieza por 3</p>
      </div>

      <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
        <input
          type="checkbox"
          name="privacidad"
          required
          className="mt-1 w-5 h-5 shrink-0 accent-secondary"
        />
        <span className="text-sm text-on-surface leading-snug">
          Autorizo el uso de mi nombre y celular para coordinar el voluntariado.
          Solo los ve el coordinador del centro. Se eliminan a los 90 días.{' '}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-secondary"
          >
            Aviso de privacidad
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[48px] bg-secondary text-on-primary font-bold rounded text-base disabled:opacity-60"
      >
        {pending ? 'Inscribiendo…' : 'Inscribirme'}
      </button>
    </form>
  )
}
