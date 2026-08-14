'use client'

import { useActionState } from 'react'
import { actualizarCentro } from '../actions'

type CentroData = {
  id: string
  name: string
  city: string
  address: string
  slug: string
  coordinator_name: string | null
}

export function FormEditarCentro({ centro }: { centro: CentroData }) {
  const boundAction = actualizarCentro.bind(null, centro.id)
  const [state, formAction, pending] = useActionState(boundAction, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div role="alert" className="p-3 bg-green-50 border border-green-300 rounded-xl text-green-800 text-sm">
          {state.success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          name="nombre"
          defaultValue={centro.name}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
        <input
          name="ciudad"
          defaultValue={centro.city}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <input
          name="direccion"
          defaultValue={centro.address}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slug (link público: /c/<strong>{centro.slug}</strong>)
        </label>
        <input
          name="slug"
          defaultValue={centro.slug}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Solo letras minúsculas, números y guiones. Los acentos se eliminan automáticamente.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Coordinador/a</label>
        <input
          name="coordinator_name"
          defaultValue={centro.coordinator_name ?? ''}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 bg-blue-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 hover:bg-blue-800"
      >
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
