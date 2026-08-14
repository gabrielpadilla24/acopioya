'use client'

import { useActionState, useState, useRef } from 'react'
import { normalizarSlug } from '@/lib/slug'
import type { CentroFormState } from './actions'
import { ESTADOS_CENTRO, type EstadoCentro } from '@/lib/constants'

function CopyButton({ url }: { url: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(url).then(() => {
          if (!ref.current) return
          ref.current.textContent = '¡Copiado!'
          setTimeout(() => { if (ref.current) ref.current.textContent = 'Copiar link' }, 2000)
        })
      }
      className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700"
    >
      Copiar link
    </button>
  )
}

type DefaultValues = {
  name?: string
  slug?: string
  address?: string
  city?: string
  coords?: string
  status?: string
  whatsapp_contact?: string | null
  coordinator_name?: string | null
  schedule_note?: string | null
}

type Props = {
  defaultValues?: DefaultValues
  action: (prevState: CentroFormState, formData: FormData) => Promise<CentroFormState>
  siteUrl?: string
}

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function FormCentro({ defaultValues, action, siteUrl }: Props) {
  const isEdit = !!defaultValues

  const [state, formAction, pending] = useActionState(action, null)

  // Slug auto-generado desde nombre (solo en creación, o si slug vacío)
  const [slug, setSlug] = useState(defaultValues?.slug ?? '')
  const [slugManual, setSlugManual] = useState(isEdit)

  function onNombreChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManual) setSlug(normalizarSlug(e.target.value))
  }

  // Éxito en creación: mostrar link del panel
  if (state?.token && siteUrl) {
    const panelLink = `${siteUrl}/panel/${state.token}`
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-400 rounded-xl">
          <p className="font-semibold text-green-900 mb-1">¡Centro creado!</p>
          <p className="text-sm text-green-800 mb-2">
            Slug: <span className="font-mono">/c/{state.slug}</span>
          </p>
          <p className="text-xs text-gray-700 font-mono break-all mb-2">{panelLink}</p>
          <CopyButton url={panelLink} />
        </div>
        {state.warning && (
          <div className="p-3 bg-amber-50 border border-amber-400 rounded-xl text-amber-900 text-sm">
            {state.warning}
          </div>
        )}
        <a href="/admin" className="block text-sm text-blue-700 underline">← Volver al admin</a>
      </div>
    )
  }

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
      {state?.warning && (
        <div role="alert" className="p-3 bg-amber-50 border border-amber-400 rounded-xl text-amber-900 text-sm">
          {state.warning}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input
          name="nombre"
          defaultValue={defaultValues?.name}
          onChange={onNombreChange}
          required
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slug (link: /c/<span className="font-mono">{slug || '…'}</span>) *
        </label>
        <input
          name="slug"
          value={slug}
          onChange={e => { setSlugManual(true); setSlug(e.target.value) }}
          required
          className={INPUT + ' font-mono'}
        />
        <p className="text-xs text-gray-500 mt-1">
          Letras minúsculas, números y guiones. Los acentos se eliminan automáticamente.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
        <input
          name="direccion"
          defaultValue={defaultValues?.address}
          required
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
        <input
          name="ciudad"
          defaultValue={defaultValues?.city ?? 'Bogotá'}
          required
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Coordenadas Google Maps (opcional)
        </label>
        <input
          name="coords"
          defaultValue={defaultValues?.coords}
          placeholder="4.6512, -74.0561"
          className={INPUT}
        />
        <p className="text-xs text-gray-500 mt-1">
          Pega las coordenadas de Google Maps, ej: 4.6512, -74.0561
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
        <select
          name="status"
          defaultValue={defaultValues?.status ?? 'open'}
          className={INPUT + ' bg-white'}
        >
          {(Object.entries(ESTADOS_CENTRO) as [EstadoCentro, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp de contacto</label>
        <input
          name="whatsapp_contact"
          defaultValue={defaultValues?.whatsapp_contact ?? ''}
          placeholder="+573001234567"
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Coordinador/a</label>
        <input
          name="coordinator_name"
          defaultValue={defaultValues?.coordinator_name ?? ''}
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Horario / notas</label>
        <textarea
          name="schedule_note"
          defaultValue={defaultValues?.schedule_note ?? ''}
          rows={2}
          className={INPUT}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 bg-blue-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 hover:bg-blue-800"
      >
        {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear centro'}
      </button>

      {isEdit && (
        <a href="/admin" className="block text-center text-sm text-gray-500 underline">
          ← Volver al admin
        </a>
      )}
    </form>
  )
}
