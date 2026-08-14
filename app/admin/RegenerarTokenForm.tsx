'use client'

import { useActionState, useRef } from 'react'
import { regenerarToken } from './centros/actions'

function CopyButton({ url }: { url: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(url).then(() => {
          if (!ref.current) return
          ref.current.textContent = '¡Copiado!'
          setTimeout(() => {
            if (ref.current) ref.current.textContent = 'Copiar link'
          }, 2000)
        })
      }}
      className="px-3 py-1 text-xs bg-on-surface text-surface-container-lowest rounded hover:opacity-90"
    >
      Copiar link
    </button>
  )
}

export function RegenerarTokenForm({
  centerId,
  siteUrl,
}: {
  centerId: string
  siteUrl: string
}) {
  const boundAction = regenerarToken.bind(null, centerId)
  const [state, formAction, pending] = useActionState(boundAction, null)

  if (state?.token) {
    const nuevoLink = `${siteUrl}/panel/${state.token}`
    return (
      <div className="mt-2 p-3 bg-tertiary-container border border-tertiary rounded text-sm space-y-2">
        <p className="font-semibold text-on-tertiary-container">Token regenerado. Link nuevo del panel:</p>
        <p className="font-mono text-xs break-all text-on-tertiary-container">{nuevoLink}</p>
        <CopyButton url={nuevoLink} />
      </div>
    )
  }

  return (
    <details className="mt-2">
      <summary className="text-xs text-on-surface-variant cursor-pointer select-none underline">
        Regenerar link del panel
      </summary>
      <div className="mt-2 p-3 bg-warning-container border border-warning rounded text-sm space-y-2">
        <p className="text-on-warning-container">
          El link actual dejará de funcionar de inmediato. El coordinador necesitará el link nuevo.
        </p>
        {state?.error && (
          <p className="text-error text-xs">{state.error}</p>
        )}
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 text-xs bg-on-surface text-surface-container-lowest rounded disabled:opacity-50 hover:opacity-90"
          >
            {pending ? 'Regenerando…' : 'Confirmar regeneración'}
          </button>
        </form>
      </div>
    </details>
  )
}
