'use client'

import { useActionState, useRef } from 'react'
import {
  crearAccesoCoord,
  regenerarInvitacion,
  invalidarSesionesYRegenerarInvitacion,
  type CoordAccesoState,
} from './coordActions'

const BOG_FMT = (d: Date | null): string =>
  d
    ? new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(d))
    : '—'

function LinkColapsado({ url }: { url: string }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  return (
    <details className="mt-1.5">
      <summary className="text-xs text-secondary cursor-pointer select-none">Ver link</summary>
      <div className="mt-1 space-y-0.5">
        <p className="font-mono text-xs text-on-surface break-all leading-relaxed">{url}</p>
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
          className="text-xs text-secondary underline"
        >
          Copiar
        </button>
      </div>
    </details>
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
      <div className="text-xs space-y-1.5">
        <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-tertiary-container text-on-tertiary-container">
          Acceso creado
        </span>
        <LinkColapsado url={state.inviteUrl} />
      </div>
    )
  }

  return (
    <div className="text-xs space-y-1.5">
      <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-surface-container text-on-surface-variant">
        Sin acceso
      </span>
      <form action={formAction} className="space-y-1">
        {state?.error && <p className="text-error">{state.error}</p>}
        <input
          name="username"
          type="text"
          defaultValue={sugerido}
          required
          minLength={3}
          placeholder="usuario"
          className="w-full text-xs border border-outline-variant rounded px-2 py-1 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-secondary underline disabled:opacity-50"
        >
          {pending ? 'Creando…' : 'Crear acceso'}
        </button>
      </form>
    </div>
  )
}

// ── Con acceso: mostrar estado y restablecer ───────────────────────────────────
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

  return (
    <div className="text-xs space-y-1.5">
      {/* Username */}
      <p className="font-mono font-semibold text-on-surface">{username}</p>

      {/* Estado como píldora */}
      {!hasPassword ? (
        <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-warning-container text-on-warning-container">
          Pendiente
        </span>
      ) : lastLoginAt ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-tertiary-container text-on-tertiary-container">
            Activo
          </span>
          <span className="font-mono text-on-surface-variant">{BOG_FMT(lastLoginAt)}</span>
        </div>
      ) : (
        <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-tertiary-container text-on-tertiary-container">
          Activo · nunca ingresó
        </span>
      )}

      {/* Link generado (colapsado) */}
      {activeUrl && <LinkColapsado url={activeUrl} />}

      {/* Errores */}
      {(stateRegen?.error || stateInval?.error) && (
        <p className="text-error">{stateRegen?.error ?? stateInval?.error}</p>
      )}

      {/* Acciones */}
      {!hasPassword ? (
        <form action={formRegen} className="inline">
          <button type="submit" disabled={pendingRegen} className="text-secondary underline disabled:opacity-50">
            {pendingRegen ? 'Creando…' : 'Reenviar invitación'}
          </button>
        </form>
      ) : (
        <form action={formInval} className="inline">
          <button type="submit" disabled={pendingInval} className="text-on-warning-container underline disabled:opacity-50">
            {pendingInval ? 'Restableciendo…' : 'Restablecer contraseña'}
          </button>
        </form>
      )}
    </div>
  )
}
