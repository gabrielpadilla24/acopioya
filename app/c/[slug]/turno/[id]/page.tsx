export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { obtenerTurnoConCentro } from '@/lib/queries'
import { ROLES, type Rol } from '@/lib/constants'
import { rangoHorario, esHoy, esMañana, formatearFecha } from '@/lib/time'
import FormInscripcion from './FormInscripcion'

type Props = { params: Promise<{ slug: string; id: string }> }

export default async function TurnoPage({ params }: Props) {
  const { slug, id } = await params
  const turno = await obtenerTurnoConCentro(id, slug)

  if (!turno) notFound()

  const ahora     = new Date()
  const terminado = new Date(turno.ends_at) <= ahora
  const cerrado   = turno.center_status === 'closed'

  const maxCupos = turno.capacity + Math.floor(turno.capacity * turno.overbook_pct / 100)
  const lleno    = turno.taken >= maxCupos

  const rolLabel = ROLES[turno.role as Rol] ?? turno.role

  const inicio = new Date(turno.starts_at)
  const fin    = new Date(turno.ends_at)
  const rango  = rangoHorario(inicio, fin)
  let etiqueta: string
  if (esHoy(inicio))    etiqueta = `Hoy, ${rango}`
  else if (esMañana(inicio)) etiqueta = `Mañana, ${rango}`
  else                  etiqueta = `${formatearFecha(inicio)}, ${rango}`

  const pct = Math.min(100, Math.round((turno.taken / turno.capacity) * 100))

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <a href={`/c/${slug}`} className="text-blue-700 text-sm">← Volver al centro</a>

      <h1 className="text-2xl font-bold text-gray-950 mt-4">{turno.center_name}</h1>
      <h2 className="text-xl font-semibold text-gray-800 mt-1">{rolLabel}</h2>
      {turno.role_detail && (
        <p className="text-gray-700 mt-0.5">{turno.role_detail}</p>
      )}
      <p className="text-gray-700 mt-2">{etiqueta}</p>

      <div className="mt-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full ${lleno ? 'bg-red-500' : 'bg-blue-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-gray-700 mt-1">
          {turno.taken} de {turno.capacity} cupos ocupados
        </p>
      </div>

      {terminado ? (
        <div className="mt-6 p-4 bg-gray-100 rounded-xl">
          <p className="font-bold text-gray-900">Este turno ya terminó.</p>
          <p className="text-gray-700 text-sm mt-1">Revisa otros turnos disponibles en el centro.</p>
          <a href={`/c/${slug}`} className="mt-3 inline-block text-blue-700 text-sm underline">
            Ver turnos del centro →
          </a>
        </div>
      ) : cerrado ? (
        <div className="mt-6 p-4 bg-red-50 border border-red-300 rounded-xl">
          <p className="font-bold text-red-900">El centro está cerrado.</p>
          <p className="text-red-800 text-sm mt-1">No se aceptan inscripciones en este momento.</p>
        </div>
      ) : lleno ? (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-300 rounded-xl">
          <p className="font-bold text-orange-900">Este turno está lleno.</p>
          <p className="text-orange-800 text-sm mt-1">Revisa otros turnos disponibles en el centro.</p>
          <a href={`/c/${slug}`} className="mt-3 inline-block text-blue-700 text-sm underline">
            Ver turnos del centro →
          </a>
        </div>
      ) : (
        <FormInscripcion slug={slug} shiftId={id} />
      )}
    </main>
  )
}
