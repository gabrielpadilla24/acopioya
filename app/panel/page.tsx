import { notFound }                                          from 'next/navigation'
import { requiereSesion }                                     from '@/lib/auth'
import { obtenerCentroPorId, type ShiftConConteos }           from '@/lib/queries'
import { CATEGORIAS_NECESIDADES, ROLES }                      from '@/lib/constants'
import { rangoHorario, esHoy, esMañana, formatearFecha }     from '@/lib/time'
import {
  salir,
  cambiarEstadoCentro,
  cambiarNivelNecesidad,
  agregarNecesidad,
  eliminarNecesidad,
  duplicarTurno,
  cerrarTurno,
  eliminarTurno,
} from './actions'
import { ConfirmButton }    from './ConfirmButton'
import { FormCrearTurno }   from './FormCrearTurno'
import { EstadoControl }    from './EstadoControl'
import { NecesidadesList }  from './NecesidadesList'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ msg?: string }>
}

function etiquetaDia(d: Date): string {
  if (esHoy(d))    return 'hoy'
  if (esMañana(d)) return 'mañana'
  return formatearFecha(d)
}

function ShiftCard({ shift, past }: { shift: ShiftConConteos; past?: boolean }) {
  const inicio   = new Date(shift.starts_at)
  const fin      = new Date(shift.ends_at)
  const activos  = shift.inscritos + shift.confirmados
  const maxCupos = shift.capacity + Math.floor(shift.capacity * shift.overbook_pct / 100)
  const rolLabel = (ROLES as Record<string, string>)[shift.role] ?? shift.role

  return (
    <div className={`border rounded p-4 ${
      past
        ? 'border-outline-variant bg-surface-container'
        : 'border-outline-variant bg-surface-container-lowest'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-on-surface text-sm">
            {rolLabel}
            {shift.role_detail && (
              <span className="font-normal text-on-surface-variant"> — {shift.role_detail}</span>
            )}
          </p>
          <p className="text-on-surface text-sm mt-0.5 font-mono">
            {etiquetaDia(inicio)}, {rangoHorario(inicio, fin)}
          </p>
          <p className="text-on-surface-variant text-xs mt-1 tabular-nums">
            {activos}/{maxCupos} cupos · {shift.confirmados} conf
            {shift.liberados  > 0 && <span> · {shift.liberados} lib</span>}
            {shift.asistieron > 0 && <span> · {shift.asistieron} asist.</span>}
          </p>
        </div>
        {shift.status === 'closed' && (
          <span className="text-xs bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full shrink-0">
            cerrado
          </span>
        )}
      </div>

      <a
        href={`/panel/turno/${shift.id}`}
        className="mt-2 inline-flex items-center min-h-[36px] text-sm text-secondary underline"
      >
        Ver inscritos
      </a>

      {!past && (
        <div className="flex gap-2 mt-2 flex-wrap">
          <form action={duplicarTurno.bind(null, shift.id)}>
            <button
              type="submit"
              className="px-3 min-h-[44px] text-xs border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container"
            >
              Duplicar +1 día
            </button>
          </form>

          {shift.status === 'open' && (
            <ConfirmButton
              action={cerrarTurno.bind(null, shift.id)}
              confirmText="¿Cerrar este turno? Dejará de aceptar nuevas inscripciones."
              className="px-3 min-h-[44px] text-xs border border-warning rounded text-on-warning-container hover:bg-warning-container"
            >
              Cerrar turno
            </ConfirmButton>
          )}

          {activos === 0 && (
            <ConfirmButton
              action={eliminarTurno.bind(null, shift.id)}
              confirmText="¿Eliminar este turno? Esta acción no se puede deshacer."
              className="px-3 min-h-[44px] text-xs border border-error rounded text-error hover:bg-error-container"
            >
              Eliminar
            </ConfirmButton>
          )}
        </div>
      )}
    </div>
  )
}

export default async function PanelPage({ searchParams }: Props) {
  const sesion = await requiereSesion()
  const { msg } = await searchParams

  const centro = await obtenerCentroPorId(sesion.user.centerId)
  if (!centro) notFound()

  const ahora         = new Date()
  const turnosFuturos = centro.shifts.filter(s => new Date(s.ends_at) > ahora)
  const turnosPasados = centro.shifts.filter(s => new Date(s.ends_at) <= ahora)
  const todayBogota   = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora)

  const categoriasActuales    = new Set(centro.needs.map(n => n.category))
  const categoriasDisponibles = CATEGORIAS_NECESIDADES.filter(c => !categoriasActuales.has(c))

  return (
    <>
      {/* ── PANEL HEADER ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-primary font-bold text-base shrink-0">AcopioYA</span>
            <span className="text-on-surface-variant text-sm truncate">{centro.name}</span>
            <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              centro.status === 'open'   ? 'bg-tertiary-container text-on-tertiary-container' :
              centro.status === 'full'   ? 'bg-warning-container text-on-warning-container' :
                                          'bg-surface-container text-on-surface-variant'
            }`}>
              {centro.status === 'open' ? 'Abierto' : centro.status === 'full' ? 'Lleno' : 'Cerrado'}
            </span>
          </div>
          <form action={salir}>
            <button
              type="submit"
              className="text-xs text-on-surface-variant border border-outline-variant rounded px-3 min-h-[36px] hover:bg-surface-container shrink-0"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      {/* ── ALERTAS ───────────────────────────────────────────────────────── */}
      {(!centro.is_active || msg) && (
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 pt-4 space-y-3">
          {!centro.is_active && (
            <div role="alert" className="p-4 bg-warning-container border border-warning rounded">
              <p className="font-semibold text-on-warning-container text-sm">Centro pausado</p>
              <p className="text-on-warning-container text-sm mt-0.5">
                No aparece en el listado público. Puedes seguir gestionando a los voluntarios inscritos.
              </p>
            </div>
          )}
          {msg && (
            <div role="alert" className="p-3 bg-error-container border border-error rounded text-error text-sm">
              {msg}
            </div>
          )}
        </div>
      )}

      {/* ── MAIN: dos columnas en desktop ─────────────────────────────────── */}
      <main className="max-w-screen-xl mx-auto px-4 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5 items-start">

          {/* ── COLUMNA IZQUIERDA ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Estado del centro */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded p-4">
              <h1 className="text-base font-bold text-on-surface">{centro.name}</h1>
              <p className="text-on-surface-variant text-xs mt-0.5 mb-4">{centro.address}, {centro.city}</p>

              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">
                Estado del centro
              </p>
              <EstadoControl
                status={centro.status as 'open' | 'full' | 'closed'}
                cambiar={cambiarEstadoCentro}
              />

              <div className="mt-4 space-y-2">
                <a
                  href={`/c/${centro.slug}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block text-secondary text-sm underline"
                >
                  Ver página pública
                </a>
                <a
                  href="/panel/afiche"
                  className="block text-secondary text-sm underline"
                >
                  Afiche de check-in
                </a>
                <div className="pt-1">
                  <a
                    href="/panel/export"
                    className="inline-flex items-center px-3 min-h-[44px] text-sm font-medium bg-on-surface text-surface-container-lowest rounded hover:opacity-90"
                  >
                    Descargar inscritos (CSV)
                  </a>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Guárdala en tu celular por si te quedas sin internet.
                  </p>
                </div>
              </div>
            </section>

            {/* Necesidades */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded p-4">
              <h2 className="text-base font-bold text-on-surface mb-3">Necesidades</h2>
              <NecesidadesList
                needs={centro.needs.map(n => ({ id: n.id, category: n.category, level: n.level }))}
                categoriasDisponibles={categoriasDisponibles}
                cambiarNivel={cambiarNivelNecesidad}
                eliminar={eliminarNecesidad}
                agregar={agregarNecesidad}
              />
            </section>

          </div>

          {/* ── COLUMNA DERECHA: Turnos ────────────────────────────────────── */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded p-4">
            <h2 className="text-base font-bold text-on-surface mb-3">Turnos</h2>

            {turnosFuturos.length === 0 && (
              <p className="text-sm text-on-surface-variant">No hay turnos próximos.</p>
            )}

            <div className="space-y-3">
              {turnosFuturos.map(shift => (
                <ShiftCard key={shift.id} shift={shift} />
              ))}
            </div>

            {turnosPasados.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm text-on-surface-variant cursor-pointer select-none py-1">
                  {turnosPasados.length} turno(s) de hoy ya terminados
                </summary>
                <div className="mt-2 space-y-3">
                  {turnosPasados.map(shift => (
                    <ShiftCard key={shift.id} shift={shift} past />
                  ))}
                </div>
              </details>
            )}

            <div className="mt-6 pt-5 border-t border-outline-variant">
              <h3 className="text-base font-bold text-on-surface mb-3">Crear nuevo turno</h3>
              <FormCrearTurno todayBogota={todayBogota} />
            </div>
          </section>

        </div>
      </main>
    </>
  )
}
