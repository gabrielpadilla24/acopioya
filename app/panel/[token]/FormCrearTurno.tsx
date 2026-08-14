'use client'

import { useActionState, useState } from 'react'
import { crearTurno }               from './actions'
import { ROLES, type Rol }          from '@/lib/constants'

export function FormCrearTurno({
  token,
  todayBogota,
}: {
  token:       string
  todayBogota: string
}) {
  const crearConToken                            = crearTurno.bind(null, token)
  const [state, formAction, pending]             = useActionState(crearConToken, null)
  const [showDetail, setShowDetail]              = useState(false)

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p role="alert" className="text-red-800 text-sm bg-red-50 border border-red-300 rounded-lg p-3">
          {state.error}
        </p>
      )}

      {/* Rol */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Rol *</label>
        <select
          name="rol"
          required
          onChange={e => setShowDetail(e.target.value === 'profesional')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(Object.entries(ROLES) as [Rol, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Especialidad — solo para rol profesional */}
      {showDetail && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Especialidad requerida *</label>
          <input
            name="role_detail"
            type="text"
            required
            placeholder="Ej: médico, enfermero, psicólogo…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Fecha y horas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
          <input
            name="fecha"
            type="date"
            required
            min={todayBogota}
            defaultValue={todayBogota}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Inicio *</label>
          <input
            name="hora_inicio"
            type="time"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fin *</label>
          <input
            name="hora_fin"
            type="time"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Capacidad y tolerancia */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cupos *</label>
          <input
            name="capacidad"
            type="number"
            min={1}
            required
            placeholder="20"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tolerancia % (sobreocupación)</label>
          <input
            name="overbook_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grupo de WhatsApp */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Enlace grupo WhatsApp (opcional)
        </label>
        <input
          name="wa_group_url"
          type="url"
          placeholder="https://chat.whatsapp.com/…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[44px] bg-blue-700 text-white font-bold rounded-xl text-sm disabled:opacity-60"
      >
        {pending ? 'Creando…' : 'Crear turno'}
      </button>
    </form>
  )
}
