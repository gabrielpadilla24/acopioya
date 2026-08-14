export const revalidate = 30

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { obtenerCentroPorSlug, listarSlugsActivos, type Need } from '@/lib/queries'
import { sql } from '@/lib/db'
import { NIVELES, ROLES, type Nivel, type Rol } from '@/lib/constants'
import { esHoy, esMañana, rangoHorario, haceCuanto, formatearFecha } from '@/lib/time'
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

  const turnosConCupo = centro.shifts.filter(s => s.taken < s.capacity).length

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

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5">

        {/* Breadcrumb */}
        <a href="/" className="text-sm text-secondary hover:underline">
          ← Todos los centros
        </a>

        {/* ── CABECERA DEL CENTRO ─────────────────────────── */}
        <h1 className="text-2xl font-bold leading-tight text-on-surface mt-3">{centro.name}</h1>

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

          {centro.coordinator_name && (
            <p className="text-on-surface-variant text-sm">
              Coordinador/a: <span className="font-medium text-on-surface">{centro.coordinator_name}</span>
            </p>
          )}
        </div>

        {/* ── NECESIDADES ─────────────────────────────────── */}
        <section className="mt-5">
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

        {/* ── TURNOS ──────────────────────────────────────── */}
        <section className="mt-6">
          <h2 className="text-lg font-bold text-on-surface mb-3">Turnos de voluntariado</h2>

          {shifts.length === 0 ? (
            <p className="text-on-surface-variant text-sm">
              No hay turnos disponibles en este momento. Vuelve a revisar pronto.
            </p>
          ) : (
            <div className="space-y-3">
              {shifts.map(s => {
                const lleno    = s.taken >= s.capacity
                const pct      = Math.min(100, Math.round((s.taken / s.capacity) * 100))
                const rolLabel = ROLES[s.role as Rol] ?? s.role

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
                        {s.taken} de {s.capacity} cupos ocupados
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

      </main>

      <Footer />
    </div>
  )
}
