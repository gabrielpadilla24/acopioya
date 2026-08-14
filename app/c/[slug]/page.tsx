export const revalidate = 30

import { notFound } from 'next/navigation'
import { obtenerCentroPorSlug, type Need } from '@/lib/queries'
import { NIVELES, ROLES, type Nivel, type Rol } from '@/lib/constants'
import { esHoy, esMañana, rangoHorario, haceCuanto, formatearFecha } from '@/lib/time'

type Props = { params: Promise<{ slug: string }> }

const STATUS_UI = {
  open:   { badge: '🟢 ABIERTO',  cls: 'bg-green-100 text-green-900' },
  full:   { badge: '🟠 LLENO',    cls: 'bg-orange-100 text-orange-900' },
  closed: { badge: '🔴 CERRADO',  cls: 'bg-red-100 text-red-900' },
} as const

const NIVEL_ORDEN: Nivel[] = ['urgent', 'needed', 'do_not_bring', 'enough']

function etiquetaTurno(starts_at: Date, ends_at: Date): string {
  const inicio = new Date(starts_at)
  const fin    = new Date(ends_at)
  const rango  = rangoHorario(inicio, fin)
  if (esHoy(inicio))    return `Hoy, ${rango}`
  if (esMañana(inicio)) return `Mañana, ${rango}`
  return `${formatearFecha(inicio)}, ${rango}`
}

function agruparNecesidades(needs: Need[]) {
  return NIVEL_ORDEN
    .map(nivel => ({ nivel, items: needs.filter(n => n.level === nivel) }))
    .filter(g => g.items.length > 0)
}

export default async function CentroPage({ params }: Props) {
  const { slug } = await params
  const centro = await obtenerCentroPorSlug(slug)

  if (!centro) notFound()

  const { needs, shifts } = centro

  const mapsUrl =
    centro.lat != null && centro.lng != null
      ? `https://maps.google.com/?q=${centro.lat},${centro.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(`${centro.address}, ${centro.city}`)}`

  const statusUI = STATUS_UI[centro.status] ?? STATUS_UI.closed

  const maxNeedTs =
    needs.length > 0
      ? Math.max(...needs.map(n => new Date(n.updated_at).getTime()))
      : null

  const grupos = agruparNecesidades(needs)

  return (
    <main className="max-w-lg mx-auto px-4 py-6">

      {/* ── HEADER ──────────────────────────────────── */}
      <h1 className="text-3xl font-bold leading-tight text-gray-950">{centro.name}</h1>

      <span className={`inline-block mt-3 px-4 py-2 rounded-lg text-base font-bold ${statusUI.cls}`}>
        {statusUI.badge}
      </span>

      <div className="mt-4 space-y-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 min-h-[44px] text-blue-700 underline font-medium"
        >
          📍 {centro.address}, {centro.city}
        </a>

        {centro.schedule_note && (
          <p className="text-gray-800 text-sm">{centro.schedule_note}</p>
        )}

        {centro.whatsapp_contact && (
          <a
            href={`https://wa.me/${centro.whatsapp_contact.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 min-h-[44px] w-full
                       bg-green-700 text-white font-bold rounded-lg mt-4 px-4"
          >
            💬 Contactar por WhatsApp
          </a>
        )}

        {centro.coordinator_name && (
          <p className="text-gray-700 text-sm mt-2">
            Coordinador/a: <span className="font-medium">{centro.coordinator_name}</span>
          </p>
        )}
      </div>

      {/* ── NECESIDADES ─────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-950">¿Qué llevar?</h2>
          {maxNeedTs && (
            <span className="text-sm font-semibold text-orange-700 shrink-0">
              Actualizado {haceCuanto(new Date(maxNeedTs))}
            </span>
          )}
        </div>

        {grupos.length === 0 ? (
          <p className="mt-3 text-gray-700 text-sm">
            Aún no hay información de necesidades publicada.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {grupos.map(({ nivel, items }) => {
              const { emoji, label } = NIVELES[nivel]
              return (
                <div key={nivel}>
                  <p className="font-bold text-gray-900 mb-1">
                    {emoji} {label}
                  </p>
                  <ul className="space-y-1 pl-1">
                    {items.map(n => (
                      <li key={n.id} className="text-gray-800">
                        {n.category}
                        {n.note && <span className="text-gray-600 text-sm"> — {n.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── TURNOS ──────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-950 mb-4">Turnos de voluntariado</h2>

        {shifts.length === 0 ? (
          <p className="text-gray-700 text-sm">
            No hay turnos disponibles en este momento. Vuelve a revisar pronto.
          </p>
        ) : (
          <div className="space-y-4">
            {shifts.map(s => {
              const lleno   = s.taken >= s.capacity
              const pct     = Math.min(100, Math.round((s.taken / s.capacity) * 100))
              const rolLabel = ROLES[s.role as Rol] ?? s.role

              return (
                <div key={s.id} className="border border-gray-300 rounded-xl p-4">
                  <p className="font-bold text-gray-950">
                    {rolLabel}
                    {s.role_detail && (
                      <span className="font-normal text-gray-700"> — {s.role_detail}</span>
                    )}
                  </p>

                  <p className="text-gray-800 text-sm mt-1">
                    {etiquetaTurno(s.starts_at, s.ends_at)}
                  </p>

                  {/* barra de progreso */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${lleno ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {s.taken} de {s.capacity} cupos ocupados
                    </p>
                  </div>

                  <div className="mt-3">
                    {lleno ? (
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 font-bold rounded-lg text-sm">
                        LLENO
                      </span>
                    ) : (
                      <a
                        href={`/c/${centro.slug}/turno/${s.id}`}
                        className="flex items-center justify-center min-h-[44px] px-4
                                   bg-blue-700 text-white font-bold rounded-lg text-center"
                      >
                        Inscribirme →
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
