'use client'

import { useActionState, useRef } from 'react'
import {
  crearAccesoCoord,
  regenerarInvitacion,
  invalidarSesionesYRegenerarInvitacion,
  type CoordAccesoState,
} from './coordActions'

function CopiarLink({ url }: { url: string }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  return (
    <div className="mt-1 text-xs text-gray-700 break-all">
      <span className="font-mono">{url}</span>
      <button
        ref={btnRef}
        type="button"
        onClick={() =>
          navigator.clipboard.writeText(url).then(() => {
            if (!btnRef.current) return
            btnRef.current.textContent = '¡Copiado!'
            setTimeout(() => { if (btnRef.current) btnRef.current.textContent = 'Copiar' }, 2000)
          })
        }
        className="ml-1 text-blue-700 underline"
      >
        Copiar
      </button>
    </div>
  )
}

// ── Sin acceso: crear nuevo ────────────────────────────────────────────────────
export function CrearAccesoForm({
  centerId,
  slug,
  siteUrl,
}: {
  centerId: string
  slug:     string
  siteUrl:  string
}) {
  const accion = crearAccesoCoord.bind(null, centerId, siteUrl)
  const [state, formAction, pending] = useActionState<CoordAccesoState, FormData>(accion, null)
  const sugerido = slug.split('-').slice(0, 2).join('-')

  if (state?.inviteUrl) {
    return (
      <div className="text-xs text-green-800 mt-1">
        <p className="font-semibold">✅ Acceso creado. Envía este link:</p>
        <CopiarLink url={state.inviteUrl} />
      </div>
    )
  }

  return (
    <div className="text-xs space-y-1 mt-1">
      <p className="text-gray-500 italic">Sin acceso creado</p>
      <form action={formAction} className="space-y-1">
        {state?.error && (
          <p className="text-red-700">{state.error}</p>
        )}
        <input
          name="username"
          type="text"
          defaultValue={sugerido}
          required
          minLength={3}
          placeholder="usuario"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
        />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-blue-700 underline disabled:opacity-50"
        >
          {pending ? 'Creando…' : 'Crear acceso'}
        </button>
      </form>
    </div>
  )
}

// ── Con acceso: mostrar estado y restablacer ──────────────────────────────────
export function RegenerarAccesoForm({
  centerId,
  userId,
  username,
  hasPassword,
  lastLoginAt,
  siteUrl,
}: {
  centerId:    string
  userId:      string
  username:    string
  hasPassword: boolean
  lastLoginAt: Date | null
  siteUrl:     string
}) {
  const accionRegen = regenerarInvitacion.bind(null, centerId, username, siteUrl)
  const accionInval = invalidarSesionesYRegenerarInvitacion.bind(null, centerId, userId, username, siteUrl)

  const [stateRegen, formRegen, pendingRegen] = useActionState<CoordAccesoState, FormData>(accionRegen, null)
  const [stateInval, formInval, pendingInval] = useActionState<CoordAccesoState, FormData>(accionInval, null)

  const activeUrl = stateRegen?.inviteUrl ?? stateInval?.inviteUrl

  const BOG_FMT = (d: Date) =>
    new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(d))

  return (
    <div className="text-xs space-y-1 mt-1">
      <p className="text-gray-700">
        Usuario: <span className="font-mono font-semibold">{username}</span>
      </p>

      {/* Estado */}
      {!hasPassword ? (
        <p className="text-amber-700 font-medium">Acceso pendiente (invitación sin usar)</p>
      ) : lastLoginAt ? (
        <p className="text-green-800">Activo · último ingreso {BOG_FMT(lastLoginAt)}</p>
      ) : (
        <p className="text-green-800">Activo · nunca ha ingresado</p>
      )}

      {(stateRegen?.error || stateInval?.error) && (
        <p className="text-red-700">{stateRegen?.error ?? stateInval?.error}</p>
      )}

      {activeUrl && (
        <div className="text-green-800">
          <p className="font-semibold">✅ Invitación lista:</p>
          <CopiarLink url={activeUrl} />
        </div>
      )}

      {/* Botón único según estado */}
      {!hasPassword ? (
        <form action={formRegen} className="inline">
          <button type="submit" disabled={pendingRegen} className="text-blue-700 underline disabled:opacity-50">
            {pendingRegen ? 'Creando…' : 'Reenviar invitación'}
          </button>
        </form>
      ) : (
        <form action={formInval} className="inline">
          <button type="submit" disabled={pendingInval} className="text-orange-700 underline disabled:opacity-50">
            {pendingInval ? 'Restableciendo…' : 'Restablecer contraseña'}
          </button>
        </form>
      )}
    </div>
  )
}
