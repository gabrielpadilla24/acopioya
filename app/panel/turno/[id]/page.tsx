import { notFound }                                from 'next/navigation'
import { requiereSesion }                          from '@/lib/auth'
import { obtenerTurnoPorIdYCentro }                from '@/lib/queries'
import { ROLES }                                    from '@/lib/constants'
import { rangoHorario, esHoy, esMañana,
         formatearFecha, formatearHora }            from '@/lib/time'
import { salir }                                   from '@/app/panel/actions'
import { marcarAsistencia }                        from './actions'
import { CopiarLista }                             from './CopiarLista'
import { LiberarAhora }                            from './LiberarAhora'
import { FormWalkIn }                              from './FormWalkIn'
import { QuitarWalkIn }                            from './QuitarWalkIn'

export const dynamic = 'force-dynamic'

const STATE_UI: Record<string, { label: string; cls: string }> = {
  inscrito:   { label: 'Inscrito',   cls: 'bg-secondary-container text-on-secondary-container' },
  confirmado: { label: 'Confirmado', cls: 'bg-tertiary-container text-on-tertiary-container' },
  asistio:    { label: 'Asistió',    cls: 'bg-tertiary-container text-on-tertiary-container' },
  liberado:   { label: 'Liberado',   cls: 'bg-warning-container text-on-warning-container' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-surface-container text-on-surface-variant' },
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function TurnoPanelPage({ params }: Props) {
  const { id } = await params
  const sesion = await requiereSesion()

  // CRÍTICO: verifica que el turno pertenezca al centro de la sesión
  const turno = await obtenerTurnoPorIdYCentro(id, sesion.user.centerId)
  if (!turno) notFound()

  const { signups } = turno
  const confirmados  = signups.filter(s => s.state === 'confirmado').length
  const liberados    = signups.filter(s => s.state === 'liberado').length
  const asistieron   = signups.filter(s => s.state === 'asistio').length

  const inicio   = new Date(turno.starts_at)
  const fin      = new Date(turno.ends_at)
  const rolLabel = (ROLES as Record<string, string>)[turno.role] ?? turno.role
  const maxCupos = turno.capacity !== null
    ? turno.capacity + Math.floor(turno.capacity * turno.overbook_pct / 100)
    : null

  let diaLabel: string
  if (esHoy(inicio))         diaLabel = 'hoy'
  else if (esMañana(inicio)) diaLabel = 'mañana'
  else                       diaLabel = formatearFecha(inicio)

  return (
    <>
      {/* Panel header */}
      <header className="sticky top-0 z-10 bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-primary font-bold text-base shrink-0">AcopioYA</span>
            <span className="text-on-surface-variant text-sm truncate">{turno.center_name}</span>
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

      <main className="max-w-2xl mx-auto px-4 lg:px-6 py-5 space-y-5">

        {/* ── CABECERA ────────────────────────────────────────────────── */}
        <div>
          <a href="/panel" className="text-secondary text-sm underline">
            Volver al panel
          </a>
        </div>

        <section className="bg-surface-container-lowest border border-outline-variant rounded p-4">
          <h1 className="text-lg font-bold text-on-surface">{rolLabel}</h1>
          {turno.role_detail && (
            <p className="text-on-surface-variant text-sm">{turno.role_detail}</p>
          )}
          <p className="text-on-surface mt-1 font-mono text-sm">
            {diaLabel}, {rangoHorario(inicio, fin)}
          </p>
          <p className="text-on-surface-variant text-sm mt-1 tabular-nums">
            {turno.taken}{maxCupos !== null ? `/${maxCupos}` : ''} reservados · {confirmados} confirmados
            {liberados  > 0 && <span> · {liberados} liberados</span>}
            {asistieron > 0 && <span> · {asistieron} asistieron</span>}
          </p>
          {turno.capacity !== null && turno.taken > turno.capacity && (
            <p className="mt-2 text-sm text-on-warning-container bg-warning-container border border-warning rounded px-3 py-2">
              Este turno está por encima de su capacidad ({turno.taken} de {turno.capacity}).
            </p>
          )}
        </section>

        {/* ── COPIAR LISTA ────────────────────────────────────────────── */}
        <CopiarLista
          signups={signups.map(s => ({ name: s.name, phone: s.phone, state: s.state }))}
        />

        {/* ── LISTA DE INSCRITOS ──────────────────────────────────────── */}
        <section className="space-y-2">
          {signups.length === 0 && (
            <p className="text-sm text-on-surface-variant">No hay inscripciones en este turno.</p>
          )}

          {signups.map(signup => {
            const ui          = STATE_UI[signup.state] ?? { label: signup.state, cls: 'bg-surface-container text-on-surface-variant' }
            const puedeMarcar = signup.state !== 'asistio' && signup.state !== 'cancelado'

            return (
              <div key={signup.id} className="border border-outline-variant rounded p-3 bg-surface-container-lowest">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface text-base leading-snug">
                      {signup.name}
                      {signup.is_walk_in && (
                        <span className="ml-2 text-xs bg-warning-container text-on-warning-container px-1.5 py-0.5 rounded-full align-middle">
                          walk-in
                        </span>
                      )}
                    </p>
                    {signup.phone && (
                      <a
                        href={`tel:${signup.phone}`}
                        className="text-secondary text-base font-mono mt-0.5 block"
                      >
                        {signup.phone}
                      </a>
                    )}
                    <p className="text-on-surface-variant text-xs mt-1">
                      Inscrito: {formatearHora(new Date(signup.created_at))}
                      {signup.checked_in_at && (
                        <span> · llegó: {formatearHora(new Date(signup.checked_in_at))}</span>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 font-medium ${ui.cls}`}>
                    {ui.label}
                  </span>
                </div>

                <div className="flex gap-2 mt-3 flex-wrap">
                  {signup.phone && (
                    <a
                      href={`https://wa.me/${signup.phone.replace(/^\+/, '')}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="px-4 min-h-[44px] flex items-center text-sm border border-tertiary-container rounded text-on-tertiary-container hover:bg-tertiary-container"
                    >
                      WhatsApp
                    </a>
                  )}

                  {puedeMarcar && (
                    <form action={marcarAsistencia.bind(null, signup.id)}>
                      <button
                        type="submit"
                        className="px-4 min-h-[44px] text-sm border border-tertiary rounded text-on-tertiary-container hover:bg-tertiary-container"
                      >
                        Marcó asistencia
                      </button>
                    </form>
                  )}

                  {signup.is_walk_in && signup.state === 'asistio' && (
                    <QuitarWalkIn signupId={signup.id} nombre={signup.name} />
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {/* ── NOTA MODO NO-SELF ───────────────────────────────────────── */}
        {turno.signup_mode === 'contacto' && (
          <section className="border border-secondary-container bg-secondary-container rounded p-4">
            <p className="text-sm text-on-secondary-container font-medium">
              Este turno lo coordinas por WhatsApp. Las personas que lleguen las registras acá como walk-in.
            </p>
          </section>
        )}
        {turno.signup_mode === 'abierto' && (
          <section className="border border-tertiary-container bg-tertiary-container rounded p-4">
            <p className="text-sm text-on-tertiary-container font-medium">
              Este turno es de entrada libre. Registra acá a quienes lleguen.
            </p>
          </section>
        )}

        {/* ── AGREGAR WALK-IN ─────────────────────────────────────────── */}
        <section className="border border-outline-variant rounded p-4 bg-surface-container-lowest">
          <h2 className="text-base font-bold text-on-surface mb-3">Agregar walk-in</h2>
          <FormWalkIn shiftId={id} />
        </section>

        {/* ── LIBERACIÓN MANUAL (solo turnos self) ────────────────────── */}
        {turno.signup_mode === 'self' && (
          <section className="border border-outline-variant rounded p-4 bg-surface-container-lowest">
            <h2 className="text-base font-bold text-on-surface mb-1">Liberación manual</h2>
            <p className="text-xs text-on-surface-variant mb-3">
              Libera los cupos de quienes no llegaron, para que otras personas puedan tomarlos.
            </p>
            <LiberarAhora shiftId={id} />
          </section>
        )}

      </main>
    </>
  )
}
