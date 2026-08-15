export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { obtenerTurnoConCentro } from '@/lib/queries'
import { ROLES, type Rol } from '@/lib/constants'
import { rangoHorario, esHoy, esMañana, formatearFecha } from '@/lib/time'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import FormInscripcion from './FormInscripcion'

type Props = { params: Promise<{ slug: string; id: string }> }

export default async function TurnoPage({ params }: Props) {
  const { slug, id } = await params
  const turno = await obtenerTurnoConCentro(id, slug)

  if (!turno) notFound()

  // Los turnos en modo contacto no tienen inscripción en línea
  if (turno.signup_mode === 'contacto') redirect(`/c/${slug}`)

  const ahora     = new Date()
  const terminado = new Date(turno.ends_at) <= ahora
  const cerrado   = turno.center_status === 'closed'

  // capacity no puede ser null aquí: el redirect de arriba cubre los turnos contacto
  const cap      = turno.capacity!
  const maxCupos = cap + Math.floor(cap * turno.overbook_pct / 100)
  const lleno    = turno.taken >= maxCupos

  const rolLabel = ROLES[turno.role as Rol] ?? turno.role

  const inicio = new Date(turno.starts_at)
  const fin    = new Date(turno.ends_at)
  const rango  = rangoHorario(inicio, fin)
  let etiqueta: string
  if (esHoy(inicio))         etiqueta = `Hoy, ${rango}`
  else if (esMañana(inicio)) etiqueta = `Mañana, ${rango}`
  else                       etiqueta = `${formatearFecha(inicio)}, ${rango}`

  const pct = Math.min(100, Math.round((turno.taken / cap) * 100))

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <a href={`/c/${slug}`} className="text-secondary text-sm">← Volver al centro</a>

        <h1 className="text-2xl font-bold text-on-surface mt-4">{turno.center_name}</h1>
        <h2 className="text-xl font-semibold text-on-surface mt-1">{rolLabel}</h2>
        {turno.role_detail && (
          <p className="text-on-surface-variant mt-0.5">{turno.role_detail}</p>
        )}
        <p className="text-on-surface mt-2">{etiqueta}</p>

        <div className="mt-4">
          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full ${lleno ? 'bg-error' : 'bg-secondary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {turno.taken} de {cap} cupos ocupados
          </p>
        </div>

        {terminado ? (
          <div className="mt-6 p-4 bg-surface-container rounded">
            <p className="font-bold text-on-surface">Este turno ya terminó.</p>
            <p className="text-on-surface-variant text-sm mt-1">Revisa otros turnos disponibles en el centro.</p>
            <a href={`/c/${slug}`} className="mt-3 inline-block text-secondary text-sm underline">
              Ver turnos del centro →
            </a>
          </div>
        ) : cerrado ? (
          <div className="mt-6 p-4 bg-error-container border border-error rounded">
            <p className="font-bold text-error">El centro está cerrado.</p>
            <p className="text-on-surface-variant text-sm mt-1">No se aceptan inscripciones en este momento.</p>
          </div>
        ) : lleno ? (
          <div className="mt-6 p-4 bg-warning-container border border-warning rounded">
            <p className="font-bold text-on-warning-container">Este turno está lleno.</p>
            <p className="text-on-warning-container text-sm mt-1">Revisa otros turnos disponibles en el centro.</p>
            <a href={`/c/${slug}`} className="mt-3 inline-block text-secondary text-sm underline">
              Ver turnos del centro →
            </a>
          </div>
        ) : (
          <FormInscripcion slug={slug} shiftId={id} />
        )}
      </main>

      <Footer />
    </div>
  )
}
