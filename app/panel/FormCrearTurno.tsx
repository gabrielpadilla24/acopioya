'use client'

import { useActionState, useState } from 'react'
import { crearTurno }               from './actions'
import { ROLES, type Rol }          from '@/lib/constants'

export function FormCrearTurno({ todayBogota }: { todayBogota: string }) {
  const [state, formAction, pending] = useActionState(crearTurno, null)
  const [showDetail, setShowDetail]  = useState(false)
  const [signupMode, setSignupMode]  = useState<'self' | 'contacto'>('self')

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p role="alert" className="text-error text-sm bg-error-container border border-error rounded p-3">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">Rol *</label>
        <select
          name="rol"
          required
          onChange={e => setShowDetail(e.target.value === 'profesional')}
          className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          {(Object.entries(ROLES) as [Rol, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {showDetail && (
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Especialidad requerida *</label>
          <input
            name="role_detail"
            type="text"
            required
            placeholder="Ej: médico, enfermero, psicólogo…"
            className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 sm:col-span-1">
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Fecha *</label>
          <input
            name="fecha"
            type="date"
            required
            min={todayBogota}
            defaultValue={todayBogota}
            className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Inicio *</label>
          <input
            name="hora_inicio"
            type="time"
            required
            className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Fin *</label>
          <input
            name="hora_fin"
            type="time"
            required
            className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-2">Modo de inscripción *</label>
        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="signup_mode"
              value="self"
              checked={signupMode === 'self'}
              onChange={() => setSignupMode('self')}
              className="mt-0.5"
            />
            <span className="text-sm text-on-surface">Los voluntarios se inscriben solos desde la página</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="signup_mode"
              value="contacto"
              checked={signupMode === 'contacto'}
              onChange={() => setSignupMode('contacto')}
              className="mt-0.5"
            />
            <span className="text-sm text-on-surface">Yo coordino a los voluntarios por WhatsApp</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">
            {signupMode === 'contacto' ? '¿Cuántos voluntarios necesitas? *' : 'Cupos *'}
          </label>
          <input
            name="capacidad"
            type="number"
            min={1}
            required
            placeholder="20"
            className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Tolerancia % (sobreocupación)</label>
          <input
            name="overbook_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">
          Enlace grupo WhatsApp (opcional)
        </label>
        <input
          name="wa_group_url"
          type="url"
          placeholder="https://chat.whatsapp.com/…"
          className="w-full border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[44px] bg-secondary text-on-primary font-bold rounded text-sm disabled:opacity-60"
      >
        {pending ? 'Creando…' : 'Crear turno'}
      </button>
    </form>
  )
}
