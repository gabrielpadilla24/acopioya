export const revalidate = 60

import { obtenerCentrosParaLanding, type CentroParaLanding } from '@/lib/queries'
import { haceCuanto } from '@/lib/time'
import Header from './components/Header'
import Footer from './components/Footer'
import MapaWrapper from './components/MapaWrapper'
import type { CentroMapa } from './components/Mapa'

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

const PILL: Record<string, string> = {
  urgent: 'bg-primary text-on-primary rounded-full px-2 py-0.5 text-xs font-semibold',
  needed: 'bg-warning-container border border-warning text-on-warning-container rounded-full px-2 py-0.5 text-xs font-semibold',
  enough: 'bg-tertiary-container text-on-tertiary-container rounded-full px-2 py-0.5 text-xs font-semibold',
}

function TarjetaCentro({ c }: { c: CentroParaLanding }) {
  const pildoras = c.needs.filter(n => n.level !== 'do_not_bring').slice(0, 7)

  return (
    <a
      href={`/c/${c.slug}`}
      className="flex flex-col border border-outline-variant rounded bg-surface-container-lowest p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-on-surface leading-tight">{c.name}</p>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${STATUS_BADGE[c.status] ?? STATUS_BADGE.closed}`}>
          {STATUS_LABEL[c.status] ?? c.status}
        </span>
      </div>
      <p className="text-on-surface-variant text-sm mt-0.5">{c.city}</p>

      {pildoras.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pildoras.map(n => (
            <span key={n.category} className={PILL[n.level] ?? PILL.enough}>
              {n.category}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 flex items-center justify-between">
        {c.last_need_update ? (
          <p className="text-xs font-mono text-on-surface-variant">
            Act. {haceCuanto(new Date(c.last_need_update))}
          </p>
        ) : (
          <span />
        )}
        <p className="text-primary text-sm font-semibold">Ver detalles →</p>
      </div>
    </a>
  )
}

export default async function HomePage() {
  const centros = await obtenerCentrosParaLanding()

  const centrosMapa: CentroMapa[] = centros
    .filter(c => c.lat !== null && c.lng !== null)
    .map(c => ({
      id:       c.id,
      slug:     c.slug,
      name:     c.name,
      city:     c.city,
      lat:      c.lat!,
      lng:      c.lng!,
      urgentes: c.needs.filter(n => n.level === 'urgent').map(n => n.category),
    }))

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── HEADER: banner + nav ─────────────────────────────────── */}
      <div className="sticky top-0 z-50 shadow-sm">
        <div
          role="status"
          className="bg-primary text-on-primary text-center py-2 px-4 text-sm font-medium"
        >
          Emergencia activa · Lleva lo que se necesita urgente
        </div>
        <Header />
      </div>

      <main className="flex-1">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 lg:px-8 pt-10 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Left: copy + CTAs */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-on-surface leading-tight">
              Ayuda donde<br />más se necesita
            </h1>
            <p className="mt-4 text-on-surface-variant text-lg leading-relaxed max-w-md">
              Centros de acopio activos en Bogotá. Ve qué llevar, inscríbete en un turno y llega cuando te necesitan.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#centros"
                className="px-6 py-3 bg-primary text-on-primary font-bold rounded text-sm min-h-[48px] flex items-center hover:bg-primary-container transition-colors"
              >
                Ver centros →
              </a>
              <a
                href="/donar"
                className="px-6 py-3 border-2 border-primary text-primary font-bold rounded text-sm min-h-[48px] flex items-center hover:bg-error-container transition-colors"
              >
                ¿Qué llevar?
              </a>
            </div>
          </div>

          {/* Right: map */}
          <div className="w-full h-[300px] lg:h-[450px] rounded overflow-hidden border border-outline-variant">
            <MapaWrapper centros={centrosMapa} />
          </div>
        </section>

        {/* ── CENTROS ──────────────────────────────────────────────── */}
        <section id="centros" className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8 scroll-mt-32">
          <h2 className="text-2xl font-bold text-on-surface mb-6">Centros de acopio</h2>

          {centros.length === 0 ? (
            <p className="text-on-surface-variant">No hay centros activos en este momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {centros.map(c => (
                <TarjetaCentro key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>

      </main>

      <Footer />
    </div>
  )
}
