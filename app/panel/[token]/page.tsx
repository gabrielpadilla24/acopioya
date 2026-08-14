import { notFound }                                          from 'next/navigation'
import { obtenerCentroPorAdminToken, type ShiftConConteos } from '@/lib/queries'
import { CATEGORIAS_NECESIDADES, NIVELES, ROLES, type Nivel, type Rol } from '@/lib/constants'
import { rangoHorario, esHoy, esMañana, formatearFecha }    from '@/lib/time'
import {
  cambiarEstadoCentro,
  cambiarNivelNecesidad,
  agregarNecesidad,
  eliminarNecesidad,
  duplicarTurno,
  cerrarTurno,
  eliminarTurno,
} from './actions'
import { ConfirmButton }  from './ConfirmButton'
import { FormCrearTurno } from './FormCrearTurno'

export const dynamic = 'force-dynamic'

const STATUS_UI = {
  open:   { emoji: '🟢', label: 'ABIERTO', cls: 'bg-green-700 text-white' },
  full:   { emoji: '🟠', label: 'LLENO',   cls: 'bg-orange-600 text-white' },
  closed: { emoji: '🔴', label: 'CERRADO', cls: 'bg-red-700 text-white' },
} as const

type Props = {
  params:       Promise<{ token: string }>
  searchParams: Promise<{ msg?: string }>
}

function etiquetaDia(d: Date): string {
  if (esHoy(d))    return 'hoy'
  if (esMañana(d)) return 'mañana'
  return formatearFecha(d)
}

function ShiftCard({
  shift,
  token,
  past,
}: {
  shift: ShiftConConteos
  token: string
  past?: boolean
}) {
  const inicio  = new Date(shift.starts_at)
  const fin     = new Date(shift.ends_at)
  const activos = shift.inscritos + shift.confirmados
  const maxCupos = shift.capacity + Math.floor(shift.capacity * shift.overbook_pct / 100)
  const rolLabel = (ROLES as Record<string, string>)[shift.role] ?? shift.role

  return (
    <div
      className={`border rounded-xl p-4 ${
        past ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-950 text-sm">
            {rolLabel}
            {shift.role_detail && (
              <span className="font-normal text-gray-600"> — {shift.role_detail}</span>
            )}
          </p>
          <p className="text-gray-700 text-sm mt-0.5">
            {etiquetaDia(inicio)}, {rangoHorario(inicio, fin)}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {activos}/{maxCupos} cupos
            {' · '}{shift.confirmados} conf
            {' · '}{shift.inscritos} insc
            {shift.liberados  > 0 && <span>{' · '}{shift.liberados} lib</span>}
            {shift.asistieron > 0 && <span>{' · '}{shift.asistieron} asistieron</span>}
          </p>
        </div>
        {shift.status === 'closed' && (
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full shrink-0">
            CERRADO
          </span>
        )}
      </div>

      <div className="mt-2">
        <a
          href={`/panel/${token}/turno/${shift.id}`}
          className="text-xs text-blue-700 underline"
        >
          Ver inscritos →
        </a>
      </div>

      {!past && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <form action={duplicarTurno.bind(null, token, shift.id)}>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Duplicar (+1 día)
            </button>
          </form>

          {shift.status === 'open' && (
            <ConfirmButton
              action={cerrarTurno.bind(null, token, shift.id)}
              confirmText="¿Cerrar este turno? Dejará de aceptar nuevas inscripciones."
              className="px-3 py-1.5 text-xs border border-orange-300 rounded-lg text-orange-700 hover:bg-orange-50"
            >
              Cerrar
            </ConfirmButton>
          )}

          {activos === 0 && (
            <ConfirmButton
              action={eliminarTurno.bind(null, token, shift.id)}
              confirmText="¿Eliminar este turno? Esta acción no se puede deshacer."
              className="px-3 py-1.5 text-xs border border-red-300 rounded-lg text-red-700 hover:bg-red-50"
            >
              Eliminar
            </ConfirmButton>
          )}
        </div>
      )}
    </div>
  )
}

export default async function PanelPage({ params, searchParams }: Props) {
  const { token } = await params
  const { msg }   = await searchParams

  const centro = await obtenerCentroPorAdminToken(token)
  if (!centro) notFound()

  const ahora         = new Date()
  const turnosFuturos = centro.shifts.filter(s => new Date(s.ends_at) > ahora)
  const turnosPasados = centro.shifts.filter(s => new Date(s.ends_at) <= ahora)
  const todayBogota   = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora)

  const categoriasActuales    = new Set(centro.needs.map(n => n.category))
  const categoriasDisponibles = CATEGORIAS_NECESIDADES.filter(c => !categoriasActuales.has(c))

  const agregarConToken = agregarNecesidad.bind(null, token)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {!centro.is_active && (
        <div role="alert" className="p-4 bg-amber-50 border border-amber-400 rounded-xl">
          <p className="font-semibold text-amber-900">Este centro está pausado</p>
          <p className="text-amber-800 text-sm mt-1">
            No aparece en el listado público y no está recibiendo inscripciones nuevas.
            Puedes seguir viendo y gestionando a los voluntarios ya inscritos.
          </p>
        </div>
      )}

      {msg && (
        <div role="alert" className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 text-sm">
          {msg}
        </div>
      )}

      {/* ── CABECERA ───────────────────────────────────────────────────────── */}
      <section>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          Panel del coordinador
        </p>
        <h1 className="text-xl font-bold text-gray-950 mt-1">{centro.name}</h1>
        <p className="text-gray-500 text-sm">{centro.address}, {centro.city}</p>

        {/* Botones de estado */}
        <div className="flex gap-2 mt-4">
          {(['open', 'full', 'closed'] as const).map(estado => {
            const ui       = STATUS_UI[estado]
            const isActive = centro.status === estado
            return (
              <form key={estado} action={cambiarEstadoCentro.bind(null, token, estado)} className="flex-1">
                <button
                  type="submit"
                  className={`w-full min-h-[56px] rounded-xl font-bold text-sm transition-colors ${
                    isActive
                      ? ui.cls
                      : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {ui.emoji}<br />{ui.label}
                </button>
              </form>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <a
            href={`/c/${centro.slug}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-blue-700 text-sm underline"
          >
            Ver página pública →
          </a>
          <a
            href={`/panel/${token}/afiche`}
            className="inline-flex items-center gap-1 text-blue-700 text-sm underline"
          >
            📄 Afiche de check-in →
          </a>
        </div>
        <div className="mt-3">
          <a
            href={`/panel/${token}/export`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg min-h-[44px] hover:bg-gray-800"
          >
            ⬇ Descargar lista de inscritos (CSV)
          </a>
          <p className="text-xs text-gray-500 mt-1.5">
            Guárdala en tu celular por si te quedas sin internet.
          </p>
        </div>
      </section>

      {/* ── NECESIDADES ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-950 mb-3">Necesidades</h2>

        {centro.needs.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">No hay categorías añadidas aún.</p>
        )}

        <div className="space-y-2">
          {centro.needs.map(need => (
            <div key={need.id} className="flex items-center gap-2">
              <span className="text-sm text-gray-900 flex-1 capitalize">{need.category}</span>

              {/* Control segmentado de nivel */}
              <div className="flex rounded-lg overflow-hidden border border-gray-300 shrink-0">
                {(Object.entries(NIVELES) as [Nivel, { emoji: string; label: string }][]).map(
                  ([nivel, { emoji, label }], i) => {
                    const isActive = need.level === nivel
                    return (
                      <form key={nivel} action={cambiarNivelNecesidad.bind(null, token, need.id, nivel)}>
                        <button
                          type="submit"
                          title={label}
                          className={`w-10 min-h-[44px] text-base ${
                            isActive ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
                          } ${i > 0 ? 'border-l border-gray-300' : ''}`}
                        >
                          {emoji}
                        </button>
                      </form>
                    )
                  },
                )}
              </div>

              <ConfirmButton
                action={eliminarNecesidad.bind(null, token, need.id)}
                confirmText={`¿Eliminar la categoría "${need.category}"?`}
                className="min-w-[36px] min-h-[44px] text-red-500 hover:text-red-700 text-lg"
              >
                ×
              </ConfirmButton>
            </div>
          ))}
        </div>

        {/* Agregar categoría */}
        <form action={agregarConToken} className="mt-4 flex gap-2">
          <input
            name="categoria"
            list="cats-lista"
            required
            placeholder="Nueva categoría…"
            className="flex-1 min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="cats-lista">
            {categoriasDisponibles.map(c => <option key={c} value={c} />)}
          </datalist>
          <button
            type="submit"
            className="px-4 min-h-[44px] bg-blue-700 text-white text-sm font-bold rounded-lg whitespace-nowrap"
          >
            + Agregar
          </button>
        </form>
      </section>

      {/* ── TURNOS ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-950 mb-3">Turnos</h2>

        {turnosFuturos.length === 0 && (
          <p className="text-sm text-gray-500">No hay turnos próximos.</p>
        )}

        <div className="space-y-3">
          {turnosFuturos.map(shift => (
            <ShiftCard key={shift.id} shift={shift} token={token} />
          ))}
        </div>

        {turnosPasados.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-gray-500 cursor-pointer select-none">
              {turnosPasados.length} turno(s) de hoy ya terminados ▸
            </summary>
            <div className="mt-2 space-y-3">
              {turnosPasados.map(shift => (
                <ShiftCard key={shift.id} shift={shift} token={token} past />
              ))}
            </div>
          </details>
        )}

        {/* Crear nuevo turno */}
        <div className="mt-6 pt-5 border-t border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-3">Crear nuevo turno</h3>
          <FormCrearTurno token={token} todayBogota={todayBogota} />
        </div>
      </section>
    </main>
  )
}
