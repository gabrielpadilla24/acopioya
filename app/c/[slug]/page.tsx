export const revalidate = 30

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { obtenerCentroPorSlug, listarSlugsActivos, type Need } from '@/lib/queries'
import { sql } from '@/lib/db'
import { NIVELES, ROLES, type Nivel, type Rol } from '@/lib/constants'
import { esHoy, esMañana, rangoHorario, haceCuanto, formatearFecha, formatearFechaSola } from '@/lib/time'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const centro = await obtenerCentroPorSlug(slug)

  if (!centro) {
    return {
      title: 'Centro no encontrado — AcopioYA',
      description: 'Centros de acopio: qué llevar y dónde ayudar.',
    }
  }

  const urgentes = centro.needs
    .filter(n => n.level === 'urgent')
    .map(n => n.category)

  const turnosConCupo = centro.shifts.filter(s => s.capacity !== null && s.taken < s.capacity).length

  let description: string
  if (urgentes.length > 0) {
    const listaUrgentes = urgentes.slice(0, 4).join(', ')
    const sufTurnos = turnosConCupo === 1
      ? '1 turno con cupo'
      : turnosConCupo > 1
        ? `${turnosConCupo} turnos con cupo`
        : ''
    description = `Urgente: ${listaUrgentes}.${sufTurnos ? ` ${sufTurnos}.` : ''}`
  } else {
    const ESTADO: Record<string, string> = { open: 'Abierto', full: 'Lleno', closed: 'Cerrado' }
    const sufTurnos = turnosConCupo > 0 ? ` ${turnosConCupo} turnos con cupo.` : ''
    description = `${ESTADO[centro.status] ?? 'Centro'} en ${centro.city}.${sufTurnos}`
  }

  description = description.slice(0, 160)

  return {
    title: `${centro.name} — AcopioYA`,
    description,
    openGraph: {
      title: centro.name,
      description,
      images: [`/c/${slug}/opengraph-image`],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
    },
  }
}

export async function generateStaticParams() {
  const centers = await listarSlugsActivos()
  return centers.map(c => ({ slug: c.slug }))
}

type Props = { params: Promise<{ slug: string }> }

const STATUS_UI = {
  open:   { badge: '🟢 ABIERTO',  cls: 'bg-tertiary-container text-on-tertiary-container' },
  full:   { badge: '🟠 LLENO',    cls: 'bg-warning-container text-on-warning-container' },
  closed: { badge: '🔴 CERRADO',  cls: 'bg-surface-container text-on-surface-variant' },
} as const

const NIVEL_ORDEN: Nivel[] = ['urgent', 'needed', 'do_not_bring', 'enough']

const SOURCE_LABELS: Record<string, string> = {
  oficial_distrital: 'la Alcaldía de Bogotá',
  cruz_roja:        'la Cruz Roja Colombiana',
  universidad:      'la institución educativa',
  aliado:           'aliado verificado',
  ciudadano:        'reporte ciudadano',
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

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

  if (!centro) {
    const [alias] = await sql<{ slug: string }[]>`
      SELECT c.slug
      FROM center_slug_aliases a
      JOIN centers c ON c.id = a.center_id
      WHERE a.slug = ${slug} AND c.is_active = true
      LIMIT 1
    `
    if (alias) permanentRedirect('/c/' + alias.slug)
    notFound()
  }

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
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 lg:px-8 py-5">

        {/* Breadcrumb */}
        <a href="/" className="text-sm text-secondary hover:underline">
          ← Todos los centros
        </a>

        {/* Aviso de fecha límite de recepción */}
        {centro.recepcion_hasta && (
          <div className="mt-3 px-4 py-3 bg-warning-container border border-warning rounded text-sm text-on-warning-container font-medium">
            Este punto recibe donaciones hasta el{' '}
            {formatearFechaSola(new Date(centro.recepcion_hasta))}.
          </div>
        )}

        {/* ── 2 columnas en desktop, 1 en móvil ──────────────────── */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 items-start">

          {/* ── COLUMNA IZQUIERDA: info del centro + necesidades ──── */}
          <div className="min-w-0">

            <h1 className="text-2xl font-bold leading-tight text-on-surface">{centro.name}</h1>

            <span className={`inline-block mt-2 px-3 py-1.5 rounded text-sm font-bold ${statusUI.cls}`}>
              {statusUI.badge}
            </span>

            {centro.schedule_note && (
              <p className="mt-1.5 text-on-surface-variant text-sm">{centro.schedule_note}</p>
            )}

            <div className="mt-3 space-y-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col justify-center w-full min-h-[48px]
                           border border-outline-variant rounded bg-surface-container-lowest px-4 py-3"
              >
                <span className="font-medium text-on-surface">📍 {centro.address}, {centro.city}</span>
                <span className="text-sm text-secondary">Abrir en Google Maps →</span>
              </a>

              {centro.whatsapp_contact && (
                <a
                  href={`https://wa.me/${centro.whatsapp_contact.replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 min-h-[48px] w-full
                             bg-tertiary text-on-tertiary font-bold rounded px-4"
                >
                  💬 Contactar por WhatsApp
                </a>
              )}

              {centro.phone && (
                <a
                  href={`tel:${centro.phone.replace(/\s/g, '')}`}
                  className="flex items-center justify-center gap-2 min-h-[48px] w-full
                             border border-outline-variant rounded bg-surface-container-lowest px-4 font-medium text-on-surface"
                >
                  📞 Llamar antes de ir
                </a>
              )}

              {centro.coordinator_name && (
                <p className="text-on-surface-variant text-sm">
                  Coordinador/a: <span className="font-medium text-on-surface">{centro.coordinator_name}</span>
                </p>
              )}
            </div>

            {/* ── NECESIDADES ──────────────────────────────────────── */}
            <section className="mt-6">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-on-surface">¿Qué llevar?</h2>
                {maxNeedTs && (
                  <span className="text-sm font-semibold text-warning shrink-0">
                    Actualizado {haceCuanto(new Date(maxNeedTs))}
                  </span>
                )}
              </div>

              {grupos.length === 0 ? (
                <p className="mt-2 text-on-surface-variant text-sm">
                  Aún no hay información de necesidades publicada.
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  {grupos.map(({ nivel, items }) => {
                    const { emoji, label } = NIVELES[nivel]
                    const esNoTraer = nivel === 'do_not_bring'
                    return (
                      <div
                        key={nivel}
                        className={esNoTraer
                          ? 'bg-error-container border border-error rounded p-3'
                          : ''}
                      >
                        <p className="font-bold text-on-surface mb-1">
                          {emoji} {label}
                        </p>
                        <ul className="space-y-0.5 pl-1">
                          {items.map(n => (
                            <li key={n.id} className="text-on-surface">
                              {capitalizar(n.category)}
                              {n.note && <span className="text-on-surface-variant text-sm"> — {n.note}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── COLUMNA DERECHA: turnos ───────────────────────────── */}
          <div className="min-w-0">
            <section>
              <h2 className="text-lg font-bold text-on-surface mb-3">Turnos de voluntariado</h2>

              {shifts.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-on-surface-variant text-sm">
                    Este centro recibe donaciones pero todavía no coordina turnos de voluntariado por AcopioYA.
                  </p>
                  {!centro.reclamado && (
                    <p className="text-on-surface-variant text-sm">
                      ¿Coordinas este centro?{' '}
                      <a
                        href="mailto:gabrielpadillab03@gmail.com?subject=Coordino%20este%20centro"
                        className="text-secondary underline"
                      >
                        Escríbenos y te damos acceso para publicar turnos.
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {shifts.map(s => {
                    const rolLabel = ROLES[s.role as Rol] ?? s.role

                    if (s.signup_mode === 'contacto') {
                      const waNum  = centro.whatsapp_contact?.replace(/[^\d]/g, '')
                      const waText = encodeURIComponent(
                        `Hola, vi en AcopioYA que buscan voluntarios para ${rolLabel} el ${etiquetaTurno(s.starts_at, s.ends_at)}. Me gustaría ayudar.`
                      )
                      return (
                        <div key={s.id} className="border border-outline-variant rounded p-4">
                          <p className="font-bold text-on-surface">
                            {rolLabel}
                            {s.role_detail && (
                              <span className="font-normal text-on-surface-variant"> — {s.role_detail}</span>
                            )}
                          </p>
                          <p className="text-on-surface text-sm mt-1">
                            {etiquetaTurno(s.starts_at, s.ends_at)}
                          </p>
                          <p className="text-sm font-semibold text-secondary mt-3">
                            {s.capacity !== null
                              ? `Se buscan ${s.capacity} voluntarios`
                              : 'Se necesitan voluntarios'}
                          </p>
                          <div className="mt-3">
                            {waNum ? (
                              <>
                                <a
                                  href={`https://wa.me/${waNum}?text=${waText}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center min-h-[44px] px-4
                                             bg-tertiary text-on-tertiary font-bold rounded text-center"
                                >
                                  Escribir por WhatsApp →
                                </a>
                                <p className="text-xs text-on-surface-variant mt-2">
                                  Este turno lo coordina directamente el centro. Escríbeles y cuéntales que quieres ayudar.
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-on-surface-variant">
                                Comunícate directamente con el centro para participar en este turno.
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    }

                    if (s.signup_mode === 'abierto') {
                      const waNum = centro.whatsapp_contact?.replace(/[^\d]/g, '')
                      return (
                        <div key={s.id} className="border border-outline-variant rounded p-4">
                          <p className="font-bold text-on-surface">
                            {rolLabel}
                            {s.role_detail && (
                              <span className="font-normal text-on-surface-variant"> — {s.role_detail}</span>
                            )}
                          </p>
                          <p className="text-on-surface text-sm mt-1">
                            {etiquetaTurno(s.starts_at, s.ends_at)}
                          </p>
                          <div className="mt-3 bg-tertiary-container rounded p-3">
                            <p className="text-sm text-on-tertiary-container">
                              No necesitas inscribirte. Llega en el horario del turno y preséntate con el coordinador.
                            </p>
                            {waNum && (
                              <p className="text-xs text-on-tertiary-container mt-2">
                                ¿Dudas antes de ir?{' '}
                                <a
                                  href={`https://wa.me/${waNum}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  Escríbeles por WhatsApp
                                </a>
                                .
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    }

                    // capacity nunca es null en modo self (CHECK shifts_capacity_self_check)
                    const cap   = s.capacity!
                    const lleno = s.taken >= cap
                    const pct   = Math.min(100, Math.round((s.taken / cap) * 100))

                    return (
                      <div key={s.id} className="border border-outline-variant rounded p-4">
                        <p className="font-bold text-on-surface">
                          {rolLabel}
                          {s.role_detail && (
                            <span className="font-normal text-on-surface-variant"> — {s.role_detail}</span>
                          )}
                        </p>

                        <p className="text-on-surface text-sm mt-1">
                          {etiquetaTurno(s.starts_at, s.ends_at)}
                        </p>

                        <div className="mt-3">
                          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${lleno ? 'bg-error' : 'bg-secondary'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-sm text-on-surface-variant mt-1">
                            {Math.min(s.taken, cap)} de {cap} cupos ocupados
                          </p>
                        </div>

                        <div className="mt-3">
                          {lleno ? (
                            <span className="inline-block px-3 py-1 bg-error-container text-error font-bold rounded text-sm">
                              LLENO
                            </span>
                          ) : (
                            <a
                              href={`/c/${centro.slug}/turno/${s.id}`}
                              className="flex items-center justify-center min-h-[44px] px-4
                                         bg-secondary text-on-primary font-bold rounded text-center"
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
          </div>

        </div>
        {/* Procedencia y verificación */}
        {centro.verified_at && centro.source && (
          <p className="mt-8 text-xs text-on-surface-variant border-t border-outline-variant pt-4">
            Información tomada de{' '}
            {centro.data_source_url ? (
              <a
                href={centro.data_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {SOURCE_LABELS[centro.source] ?? centro.source}
              </a>
            ) : (
              <span>{SOURCE_LABELS[centro.source] ?? centro.source}</span>
            )}{' '}
            y verificada el {formatearFecha(new Date(centro.verified_at))}.
          </p>
        )}

      </main>

      <Footer />
    </div>
  )
}
