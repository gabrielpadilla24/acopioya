export const revalidate = 300

import { obtenerCentrosParaLanding } from '@/lib/queries'
import { haceCuanto } from '@/lib/time'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

const STATUS_BADGE: Record<string, string> = {
  open:   'bg-tertiary-container text-on-tertiary-container',
  full:   'bg-warning-container text-on-warning-container',
  closed: 'bg-surface-container text-on-surface-variant',
}
const STATUS_LABEL: Record<string, string> = {
  open:   'Abierto',
  full:   'Lleno',
  closed: 'Cerrado',
}

const NIVEL_ICON: Record<string, string> = {
  urgent:       '🔴',
  needed:       '🟡',
  enough:       '🟢',
  do_not_bring: '⛔',
}
const NIVEL_LABEL: Record<string, string> = {
  urgent:       'URGENTE',
  needed:       'SE NECESITA',
  enough:       'SUFICIENTE',
  do_not_bring: 'NO TRAER',
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function DonarPage() {
  const centros = await obtenerCentrosParaLanding()
  const conContenido = centros.filter(c => c.needs.length > 0 || c.status === 'open')

  return (
    <div className="flex flex-col min-h-screen">

      <Header />

      <main className="flex-1 max-w-screen-xl mx-auto px-4 lg:px-8 py-8 w-full">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface">¿Qué necesitan los centros?</h1>
          <p className="mt-2 text-on-surface-variant">
            Información actualizada por los coordinadores de cada centro. Lleva lo que esté marcado como <strong>URGENTE</strong> primero.
          </p>
        </div>

        {conContenido.length === 0 ? (
          <p className="text-on-surface-variant">No hay centros activos con información de necesidades.</p>
        ) : (
          <div className="space-y-6">
            {conContenido.map(c => {
              const mapsUrl = c.lat !== null && c.lng !== null
                ? `https://maps.google.com/?q=${c.lat},${c.lng}`
                : `https://maps.google.com/?q=${encodeURIComponent(`${c.address}, ${c.city}`)}`

              const urgentes    = c.needs.filter(n => n.level === 'urgent')
              const necesitados = c.needs.filter(n => n.level === 'needed')
              const suficientes = c.needs.filter(n => n.level === 'enough')
              const noTraer     = c.needs.filter(n => n.level === 'do_not_bring')

              const grupos = [
                { nivel: 'urgent',       items: urgentes },
                { nivel: 'needed',       items: necesitados },
                { nivel: 'enough',       items: suficientes },
                { nivel: 'do_not_bring', items: noTraer },
              ].filter(g => g.items.length > 0)

              return (
                <div
                  key={c.id}
                  className="border border-outline-variant rounded bg-surface-container-lowest p-5 lg:p-6"
                >
                  {/* Header del card */}
                  <div className="flex flex-wrap items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-on-surface">{c.name}</h2>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_BADGE[c.status] ?? STATUS_BADGE.closed}`}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </div>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-sm text-secondary hover:underline"
                      >
                        📍 {c.address}, {c.city} →
                      </a>
                    </div>

                    {c.whatsapp_contact && (
                      <a
                        href={`https://wa.me/${c.whatsapp_contact.replace('+', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-tertiary text-on-tertiary text-sm font-bold rounded min-h-[44px] flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>

                  {c.schedule_note && (
                    <p className="text-on-surface-variant text-sm mb-4 border-l-2 border-outline-variant pl-3">
                      {c.schedule_note}
                    </p>
                  )}

                  {/* Necesidades */}
                  {grupos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {grupos.map(({ nivel, items }) => (
                        <div
                          key={nivel}
                          className={
                            nivel === 'do_not_bring' || nivel === 'urgent'
                              ? 'bg-error-container border border-error rounded p-3'
                              : nivel === 'needed'
                                ? 'bg-warning-container border border-warning rounded p-3'
                                : 'bg-surface-container rounded p-3'
                          }
                        >
                          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">
                            {NIVEL_ICON[nivel]} {NIVEL_LABEL[nivel]}
                          </p>
                          <ul className="space-y-1">
                            {items.map(n => (
                              <li key={n.category} className="text-sm text-on-surface">
                                {capitalizar(n.category)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm">No hay información de necesidades publicada aún.</p>
                  )}

                  {/* Footer del card */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    {c.last_need_update ? (
                      <p className="text-xs font-mono text-on-surface-variant">
                        Act. {haceCuanto(new Date(c.last_need_update))}
                      </p>
                    ) : <span />}

                    <a
                      href={`/c/${c.slug}`}
                      className="text-sm text-primary font-semibold hover:underline"
                    >
                      Inscribirme como voluntario →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
