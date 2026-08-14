export const dynamic = 'force-dynamic'

import { notFound }                        from 'next/navigation'
import { obtenerSignupPorToken }            from '@/lib/queries'
import { ROLES, type Rol }                  from '@/lib/constants'
import { esHoy, esMañana, rangoHorario,
         formatearFecha, formatearHora }    from '@/lib/time'
import { cancelar, confirmar }              from './actions'

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
      <h1 className="text-2xl font-bold text-gray-950">{sg.center_name}</h1>
      <p className="text-lg font-semibold text-gray-800 mt-1">
        {rolLabel}
        {sg.role_detail && <span className="font-normal text-gray-700"> — {sg.role_detail}</span>}
      </p>
      <p className="text-gray-700 mt-1">{etiqueta(inicio, fin)}</p>
      <p className="text-gray-600 text-sm mt-0.5">{sg.center_address}, {sg.center_city}</p>
    </div>
  )

  const botonCancelar = (
    <form action={cancelarConToken} className="mt-3">
      <button
        type="submit"
        className="w-full min-h-[44px] border border-gray-300 rounded-xl text-gray-700 text-sm font-medium bg-white"
      >
        Cancelar mi inscripción
      </button>
    </form>
  )

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      {resumen}

      {/* Error banner from confirmar redirect */}
      {msg && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm font-medium">
          {msg}
        </div>
      )}

      {/* ── Estado: INSCRITO ─────────────────────────────────── */}
      {sg.state === 'inscrito' && !enVentana && !yaEmpezó && (
        <div>
          <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 text-sm text-blue-900">
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
              className="w-full min-h-[56px] bg-green-700 text-white font-bold rounded-xl text-lg"
            >
              ✅ Confirmo que voy
            </button>
          </form>
          {botonCancelar}
        </div>
      )}

      {sg.state === 'inscrito' && yaEmpezó && (
        <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-700">
          <p className="font-semibold">El turno ya comenzó.</p>
          <p className="mt-1">Si aún no llegaste, intenta coinscribirte desde el centro.</p>
        </div>
      )}

      {/* ── Estado: CONFIRMADO ───────────────────────────────── */}
      {sg.state === 'confirmado' && (
        <div>
          <div className="bg-green-50 border border-green-400 rounded-xl p-4">
            <p className="font-bold text-green-900">✅ Confirmado. ¡Te esperamos!</p>
            <p className="text-green-800 text-sm mt-1">
              A las {formatearHora(inicio)} en {sg.center_address}.
            </p>
            <p className="text-green-700 text-sm mt-1">Al llegar, escanea el QR del centro.</p>
          </div>
          {botonCancelar}
        </div>
      )}

      {/* ── Estado: LIBERADO ─────────────────────────────────── */}
      {sg.state === 'liberado' && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
          <p className="font-bold text-orange-900">Tu cupo se liberó.</p>
          <p className="text-orange-800 text-sm mt-1">
            No confirmaste a tiempo y el cupo quedó disponible para otra persona.
          </p>
          <p className="text-orange-800 text-sm mt-2">
            ¿Aún quieres ir?{' '}
            <a href={`/c/${sg.center_slug}`} className="underline font-medium">
              Vuelve al centro e inscríbete de nuevo
            </a>
          </p>
        </div>
      )}

      {/* ── Estado: CANCELADO ────────────────────────────────── */}
      {sg.state === 'cancelado' && (
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="font-bold text-gray-900">Cancelaste este turno.</p>
          <p className="text-gray-700 text-sm mt-1">
            <a href="/" className="underline text-blue-700">Ver otros centros y turnos</a>
          </p>
        </div>
      )}

      {/* ── Estado: ASISTIO ──────────────────────────────────── */}
      {sg.state === 'asistio' && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 text-center">
          <p className="text-2xl font-bold text-gray-950">¡Gracias por ayudar! 💛</p>
          <p className="text-gray-700 mt-2 text-sm">Tu participación hace la diferencia.</p>
        </div>
      )}
    </main>
  )
}
