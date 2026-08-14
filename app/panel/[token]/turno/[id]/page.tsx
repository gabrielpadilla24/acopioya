import { notFound }                                 from 'next/navigation'
import { obtenerTurnoParaPanel }                   from '@/lib/queries'
import { ROLES, type Rol }                         from '@/lib/constants'
import { rangoHorario, esHoy, esMañana,
         formatearFecha, formatearHora }            from '@/lib/time'
import { marcarAsistencia }                        from './actions'
import { CopiarLista }                             from './CopiarLista'
import { LiberarAhora }                            from './LiberarAhora'
import { FormWalkIn }                              from './FormWalkIn'

export const dynamic = 'force-dynamic'

const STATE_UI: Record<string, { label: string; cls: string }> = {
  inscrito:  { label: 'inscrito',   cls: 'bg-blue-100 text-blue-800' },
  confirmado:{ label: 'confirmado', cls: 'bg-green-100 text-green-800' },
  asistio:   { label: 'asistió',    cls: 'bg-purple-100 text-purple-800' },
  liberado:  { label: 'liberado',   cls: 'bg-orange-100 text-orange-800' },
  cancelado: { label: 'cancelado',  cls: 'bg-gray-100 text-gray-500' },
}

type Props = {
  params: Promise<{ token: string; id: string }>
}

export default async function TurnoPanelPage({ params }: Props) {
  const { token, id } = await params

  const turno = await obtenerTurnoParaPanel(token, id)
  if (!turno) notFound()

  const { signups } = turno
  const confirmados  = signups.filter(s => s.state === 'confirmado').length
  const sinConfirmar = signups.filter(s => s.state === 'inscrito').length
  const liberados    = signups.filter(s => s.state === 'liberado').length
  const asistieron   = signups.filter(s => s.state === 'asistio').length

  const inicio    = new Date(turno.starts_at)
  const fin       = new Date(turno.ends_at)
  const rolLabel  = (ROLES as Record<string, string>)[turno.role] ?? turno.role
  const maxCupos  = turno.capacity + Math.floor(turno.capacity * turno.overbook_pct / 100)

  let diaLabel: string
  if (esHoy(inicio))    diaLabel = 'hoy'
  else if (esMañana(inicio)) diaLabel = 'mañana'
  else diaLabel = formatearFecha(inicio)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ── CABECERA ─────────────────────────────────────────────────────── */}
      <a href={`/panel/${token}`} className="text-blue-700 text-sm">
        ← Volver al panel
      </a>

      <section>
        <h1 className="text-xl font-bold text-gray-950">{rolLabel}</h1>
        {turno.role_detail && (
          <p className="text-gray-600 text-sm">{turno.role_detail}</p>
        )}
        <p className="text-gray-700 mt-1">{diaLabel}, {rangoHorario(inicio, fin)}</p>
        <p className="text-gray-500 text-sm mt-1">
          {turno.taken}/{maxCupos} cupos reservados
          {' · '}{confirmados} confirmados
          {' · '}{sinConfirmar} sin confirmar
          {liberados  > 0 && <span>{' · '}{liberados} liberados</span>}
          {asistieron > 0 && <span>{' · '}{asistieron} asistieron</span>}
        </p>
      </section>

      {/* ── COPIAR LISTA ─────────────────────────────────────────────────── */}
      <CopiarLista
        signups={signups.map(s => ({ name: s.name, phone: s.phone, state: s.state }))}
      />

      {/* ── LISTA DE INSCRITOS ───────────────────────────────────────────── */}
      <section className="space-y-2">
        {signups.length === 0 && (
          <p className="text-sm text-gray-500">No hay inscripciones en este turno.</p>
        )}

        {signups.map(signup => {
          const ui         = STATE_UI[signup.state] ?? { label: signup.state, cls: 'bg-gray-100 text-gray-600' }
          const puedeMarcar = signup.state !== 'asistio' && signup.state !== 'cancelado'

          return (
            <div key={signup.id} className="border border-gray-200 rounded-xl p-3 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-950 text-sm">
                    {signup.name}
                    {signup.is_walk_in && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                        walk-in
                      </span>
                    )}
                  </p>
                  {signup.phone && (
                    <p className="text-gray-600 text-sm font-mono">{signup.phone}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-0.5">
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

              <div className="flex gap-2 mt-2 flex-wrap">
                {signup.phone && (
                  <a
                    href={`https://wa.me/${signup.phone.replace(/^\+/, '')}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs px-3 py-1.5 border border-green-300 rounded-lg text-green-700 hover:bg-green-50"
                  >
                    💬 WhatsApp
                  </a>
                )}

                {puedeMarcar && (
                  <form action={marcarAsistencia.bind(null, token, signup.id)}>
                    <button
                      type="submit"
                      className="text-xs px-3 py-1.5 border border-purple-300 rounded-lg text-purple-700 hover:bg-purple-50"
                    >
                      ✓ Marcó asistencia
                    </button>
                  </form>
                )}
              </div>
            </div>
          )
        })}
      </section>

      {/* ── AGREGAR WALK-IN ──────────────────────────────────────────────── */}
      <section className="border-t border-gray-200 pt-5">
        <h2 className="text-base font-bold text-gray-900 mb-3">+ Agregar walk-in</h2>
        <FormWalkIn token={token} shiftId={id} />
      </section>

      {/* ── LIBERACIÓN MANUAL ────────────────────────────────────────────── */}
      <section className="border-t border-gray-200 pt-5">
        <h2 className="text-base font-bold text-gray-900 mb-1">Liberación manual</h2>
        <p className="text-xs text-gray-500 mb-3">
          Libera inscritos que no confirmaron en la ventana T-4 h a T-2 h antes del inicio.
          El cron lo hace cada 15 min; esto es el respaldo.
        </p>
        <LiberarAhora token={token} shiftId={id} />
      </section>
    </main>
  )
}
