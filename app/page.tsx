export const revalidate = 60

import {
  obtenerCentrosParaHome,
  obtenerTurnosDescubiertos,
} from '@/lib/queries'
import { ROLES, type Rol } from '@/lib/constants'
import { esHoy, esMañana, rangoHorario, formatearFecha } from '@/lib/time'

const STATUS_UI = {
  open:   { badge: '🟢 ABIERTO',  cls: 'bg-green-100 text-green-900' },
  full:   { badge: '🟠 LLENO',    cls: 'bg-orange-100 text-orange-900' },
  closed: { badge: '🔴 CERRADO',  cls: 'bg-red-100 text-red-900' },
} as const

function etiquetaTurno(starts_at: Date, ends_at: Date): string {
  const inicio = new Date(starts_at)
  const fin    = new Date(ends_at)
  const rango  = rangoHorario(inicio, fin)
  if (esHoy(inicio))    return `Hoy, ${rango}`
  if (esMañana(inicio)) return `Mañana, ${rango}`
  return `${formatearFecha(inicio)}, ${rango}`
}

function esNocturno(starts_at: Date): boolean {
  const hora = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date(starts_at)).find(p => p.type === 'hour')?.value ?? '0'
  return parseInt(hora) >= 17
}

export default async function HomePage() {
  const [centros, turnos] = await Promise.all([
    obtenerCentrosParaHome(),
    obtenerTurnosDescubiertos(),
  ])

  return (
    <main className="max-w-lg mx-auto px-4 py-6">

      {/* ── HERO ────────────────────────────────────── */}
      <div className="py-4">
        <h1 className="text-3xl font-bold text-gray-950">AcopioYA</h1>
        <p className="mt-2 text-gray-700 text-base leading-snug">
          Encuentra dónde ayudar. Inscríbete en un turno.<br />
          Llega cuando te necesitan.
        </p>
      </div>

      {/* ── TURNOS DESCUBIERTOS ──────────────────────── */}
      {turnos.length > 0 && (
        <section className="mt-4">
          <h2 className="text-lg font-bold text-gray-950 mb-3">
            Turnos que necesitan gente
          </h2>
          <div className="space-y-3">
            {turnos.map(t => {
              const nocturno = esNocturno(t.starts_at)
              const rolLabel = ROLES[t.role as Rol] ?? t.role
              return (
                <a
                  key={t.id}
                  href={`/c/${t.center_slug}`}
                  className={`block rounded-xl p-4 min-h-[44px] ${
                    nocturno
                      ? 'border-2 border-indigo-400 bg-indigo-50'
                      : 'border border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-950 leading-tight">{t.center_name}</p>
                    {nocturno && (
                      <span className="shrink-0 text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                        🌙 Nocturno
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 text-sm mt-0.5">{rolLabel}</p>
                  <p className="text-gray-700 text-sm mt-1">
                    {etiquetaTurno(t.starts_at, t.ends_at)}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    {t.taken} de {t.capacity} cupos ocupados
                  </p>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* ── CENTROS ──────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-lg font-bold text-gray-950 mb-3">Centros de acopio</h2>

        {centros.length === 0 ? (
          <p className="text-gray-700 text-sm">No hay centros activos en este momento.</p>
        ) : (
          <div className="space-y-3">
            {centros.map(c => {
              const ui = STATUS_UI[c.status] ?? STATUS_UI.closed
              const resumen: string[] = []
              if (c.urgent_count > 0)
                resumen.push(`🔴 ${c.urgent_count} ${c.urgent_count === 1 ? 'urgente' : 'urgentes'}`)
              if (c.available_shifts > 0)
                resumen.push(`${c.available_shifts} ${c.available_shifts === 1 ? 'turno con cupo' : 'turnos con cupo'}`)

              return (
                <a
                  key={c.id}
                  href={`/c/${c.slug}`}
                  className="block border border-gray-300 rounded-xl p-4 bg-white min-h-[44px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-950 leading-tight">{c.name}</p>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg ${ui.cls}`}>
                      {ui.badge}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-0.5">{c.city}</p>
                  {resumen.length > 0 && (
                    <p className="text-gray-700 text-sm mt-1">{resumen.join(' · ')}</p>
                  )}
                </a>
              )
            })}
          </div>
        )}
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="mt-10 pt-6 border-t border-gray-200 space-y-2 text-sm text-gray-600">
        <p>
          <a href="/privacidad" className="underline min-h-[44px] inline-flex items-center">
            Aviso de privacidad
          </a>
        </p>
        <p>
          ¿Coordinas un centro de acopio?{' '}
          <a href="mailto:coordinacion@acopioya.co" className="underline text-blue-700">
            Escríbenos
          </a>
        </p>
      </footer>
    </main>
  )
}
