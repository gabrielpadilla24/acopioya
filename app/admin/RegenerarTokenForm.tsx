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
      className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700"
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
      <div className="mt-2 p-3 bg-green-50 border border-green-300 rounded-lg text-sm space-y-2">
        <p className="font-semibold text-green-900">Token regenerado. Link nuevo del panel:</p>
        <p className="font-mono text-xs break-all text-gray-800">{nuevoLink}</p>
        <CopyButton url={nuevoLink} />
      </div>
    )
  }

  return (
    <details className="mt-2">
      <summary className="text-xs text-orange-700 cursor-pointer select-none underline">
        Regenerar link del panel
      </summary>
      <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm space-y-2">
        <p className="text-orange-900">
          El link actual dejará de funcionar de inmediato. El coordinador necesitará el link nuevo.
        </p>
        {state?.error && (
          <p className="text-red-700 text-xs">{state.error}</p>
        )}
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 text-xs bg-orange-700 text-white rounded-lg disabled:opacity-50 hover:bg-orange-800"
          >
            {pending ? 'Regenerando…' : 'Confirmar regeneración'}
          </button>
        </form>
      </div>
    </details>
  )
}
