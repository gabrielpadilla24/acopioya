export const dynamic = 'force-dynamic'

import { notFound }                        from 'next/navigation'
import { obtenerSignupPorToken }            from '@/lib/queries'
import { ROLES, type Rol }                  from '@/lib/constants'
import { esHoy, esMañana, rangoHorario,
         formatearFecha, formatearHora }    from '@/lib/time'
import { cancelar, confirmar }              from './actions'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

type Props = {
  params:       Promise<{ token: string }>
  searchParams: Promise<{ msg?: string }>
}

function etiqueta(starts_at: Date, ends_at: Date): string {
  const rango = rangoHorario(starts_at, ends_at)
  if (esHoy(starts_at))    return `Hoy, ${rango}`
  if (esMañana(starts_at)) return `Mañana, ${rango}`
  return `${formatearFecha(starts_at)}, ${rango}`
}

export default async function GestionarPage({ params, searchParams }: Props) {
  const { token } = await params
  const { msg }   = await searchParams

  const sg = await obtenerSignupPorToken(token)
  if (!sg) notFound()

  const inicio    = new Date(sg.starts_at)
  const fin       = new Date(sg.ends_at)
  const ahora     = new Date()
  const cuatroAntes  = new Date(inicio.getTime() - 4 * 60 * 60 * 1000)
  const enVentana    = ahora >= cuatroAntes && ahora < inicio
  const yaEmpezó     = ahora >= inicio

  const rolLabel = ROLES[sg.role as Rol] ?? sg.role
  const horaConf = formatearHora(cuatroAntes)

  const cancelarConToken  = cancelar.bind(null, token)
  const confirmarConToken = confirmar.bind(null, token)

  const resumen = (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-on-surface">{sg.center_name}</h1>
      <p className="text-lg font-semibold text-on-surface mt-1">
        {rolLabel}
        {sg.role_detail && <span className="font-normal text-on-surface-variant"> — {sg.role_detail}</span>}
      </p>
      <p className="text-on-surface mt-1">{etiqueta(inicio, fin)}</p>
      <p className="text-on-surface-variant text-sm mt-0.5">{sg.center_address}, {sg.center_city}</p>
    </div>
  )

  const botonCancelar = (
    <form action={cancelarConToken} className="mt-3">
      <button
        type="submit"
        className="w-full min-h-[44px] border border-outline-variant rounded text-on-surface-variant text-sm font-medium bg-surface-container-lowest"
      >
        Cancelar mi inscripción
      </button>
    </form>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Header variant="logo-only" />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {resumen}

        {/* Error banner from confirmar redirect */}
        {msg && (
          <div role="alert" className="mb-4 p-3 bg-error-container border border-error rounded text-error text-sm font-medium">
            {msg}
          </div>
        )}

        {/* ── Estado: INSCRITO ─────────────────────────────────── */}
        {sg.state === 'inscrito' && !enVentana && !yaEmpezó && (
          <div>
            <div className="bg-secondary-container border border-secondary rounded p-4 text-sm text-on-secondary-container">
              <p className="font-semibold">Tu inscripción está activa.</p>
              <p className="mt-1">
                Podrás confirmar tu asistencia a partir de las <strong>{horaConf}</strong> (4 horas antes del turno).
              </p>
            </div>
            {botonCancelar}
          </div>
        )}

        {sg.state === 'inscrito' && enVentana && (
          <div>
            <form action={confirmarConToken}>
              <button
                type="submit"
                className="w-full min-h-[56px] bg-tertiary text-on-tertiary font-bold rounded text-lg"
              >
                ✅ Confirmo que voy
              </button>
            </form>
            {botonCancelar}
          </div>
        )}

        {sg.state === 'inscrito' && yaEmpezó && (
          <div className="bg-surface-container rounded p-4 text-sm text-on-surface-variant">
            <p className="font-semibold text-on-surface">El turno ya comenzó.</p>
            <p className="mt-1">Si aún no llegaste, intenta coinscribirte desde el centro.</p>
          </div>
        )}

        {/* ── Estado: CONFIRMADO ───────────────────────────────── */}
        {sg.state === 'confirmado' && (
          <div>
            <div className="bg-tertiary-container border border-tertiary rounded p-4">
              <p className="font-bold text-on-tertiary-container">✅ Confirmado. ¡Te esperamos!</p>
              <p className="text-on-tertiary-container text-sm mt-1">
                A las {formatearHora(inicio)} en {sg.center_address}.
              </p>
              <p className="text-on-tertiary-container text-sm mt-1">Al llegar, escanea el QR del centro.</p>
            </div>
            {botonCancelar}
          </div>
        )}

        {/* ── Estado: LIBERADO ─────────────────────────────────── */}
        {sg.state === 'liberado' && (
          <div className="bg-warning-container border border-warning rounded p-4">
            <p className="font-bold text-on-warning-container">Tu cupo se liberó.</p>
            <p className="text-on-warning-container text-sm mt-1">
              No confirmaste a tiempo y el cupo quedó disponible para otra persona.
            </p>
            <p className="text-on-warning-container text-sm mt-2">
              ¿Aún quieres ir?{' '}
              <a href={`/c/${sg.center_slug}`} className="underline font-medium">
                Vuelve al centro e inscríbete de nuevo
              </a>
            </p>
          </div>
        )}

        {/* ── Estado: CANCELADO ────────────────────────────────── */}
        {sg.state === 'cancelado' && (
          <div className="bg-surface-container rounded p-4">
            <p className="font-bold text-on-surface">Cancelaste este turno.</p>
            <p className="text-on-surface-variant text-sm mt-1">
              <a href="/" className="underline text-secondary">Ver otros centros y turnos</a>
            </p>
          </div>
        )}

        {/* ── Estado: ASISTIO ──────────────────────────────────── */}
        {sg.state === 'asistio' && (
          <div className="bg-tertiary-container border border-tertiary rounded p-6 text-center">
            <p className="text-2xl font-bold text-on-surface">¡Gracias por ayudar! 💛</p>
            <p className="text-on-surface-variant mt-2 text-sm">Tu participación hace la diferencia.</p>
          </div>
        )}

        {/* Volver discreto al pie */}
        <div className="mt-8 pt-6 border-t border-outline-variant">
          <a href="/" className="text-sm text-on-surface-variant hover:text-on-surface">
            ← Ver otros centros
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
}
