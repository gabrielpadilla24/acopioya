import { sql }       from '@/lib/db'
import { haceCuanto } from '@/lib/time'

export const dynamic = 'force-dynamic'

type Metricas = {
  total:       number
  ultimas_24h: number
  conf_denom:  number
  conf_num:    number
  asist_denom: number
  asist_num:   number
}

type BucketHora = {
  hora_bogota: Date
  conteo:      number
}

type CentroMetricas = {
  id:               string
  name:             string
  coordinator_name: string | null
  whatsapp_contact: string | null
  walk_ins:         number
  last_need_update: Date | null
}

function fmtHora(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).format(d)
}

export default async function MetricasPage() {
  const [metricas, buckets, centros] = await Promise.all([

    // ── 1. Métricas escalares ─────────────────────────────────────────────
    sql<Metricas[]>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE sg.created_at > now() - INTERVAL '24 hours'
        )::int AS ultimas_24h,
        COUNT(*) FILTER (
          WHERE sh.starts_at < now()
            AND sg.state <> 'cancelado'
        )::int AS conf_denom,
        COUNT(*) FILTER (
          WHERE sh.starts_at < now()
            AND sg.state IN ('confirmado', 'asistio')
        )::int AS conf_num,
        COUNT(*) FILTER (
          WHERE sh.ends_at < now()
            AND sg.state IN ('confirmado', 'asistio')
        )::int AS asist_denom,
        COUNT(*) FILTER (
          WHERE sh.ends_at < now()
            AND sg.state = 'asistio'
        )::int AS asist_num
      FROM signups sg
      JOIN shifts  sh ON sh.id = sg.shift_id
      JOIN centers c  ON c.id  = sh.center_id
      WHERE c.is_active = true
    `,

    // ── 2. Inscripciones por hora (últimas 24 h, hora de Bogotá) ─────────
    // double AT TIME ZONE: timestamptz → Bogotá timestamp → truncar → timestamptz
    sql<BucketHora[]>`
      SELECT
        date_trunc('hour', sg.created_at AT TIME ZONE 'America/Bogota')
          AT TIME ZONE 'America/Bogota'   AS hora_bogota,
        COUNT(*)::int                     AS conteo
      FROM signups sg
      JOIN shifts  sh ON sh.id = sg.shift_id
      JOIN centers c  ON c.id  = sh.center_id
      WHERE c.is_active = true
        AND sg.created_at > now() - INTERVAL '24 hours'
      GROUP BY 1
      ORDER BY 1
    `,

    // ── 3. Por centro: walk-ins + última actualización de necesidades ─────
    // Subqueries pre-agregadas para evitar el cross-product needs × signups
    sql<CentroMetricas[]>`
      SELECT
        c.id,
        c.name,
        c.coordinator_name,
        c.whatsapp_contact,
        COALESCE(wi.walk_ins, 0)::int AS walk_ins,
        maxn.last_need_update
      FROM centers c
      LEFT JOIN (
        SELECT sh.center_id,
               COUNT(*) FILTER (WHERE sg.is_walk_in = true)::int AS walk_ins
        FROM shifts  sh
        JOIN signups sg ON sg.shift_id = sh.id
        GROUP BY sh.center_id
      ) wi   ON wi.center_id  = c.id
      LEFT JOIN (
        SELECT center_id, MAX(updated_at) AS last_need_update
        FROM needs
        GROUP BY center_id
      ) maxn ON maxn.center_id = c.id
      WHERE c.is_active = true
      ORDER BY c.name
    `,
  ])

  const m         = metricas[0]
  const maxBucket = buckets.length > 0 ? Math.max(...buckets.map(b => b.conteo)) : 1
  const confPct   = m.conf_denom  > 0
    ? Math.round(m.conf_num  / m.conf_denom  * 100) : null
  const asistPct  = m.asist_denom > 0
    ? Math.round(m.asist_num / m.asist_denom * 100) : null

  const DOCE_H_MS      = 12 * 60 * 60 * 1000
  const ahora          = Date.now()
  const desactualizados = centros.filter(
    c => !c.last_need_update ||
         ahora - new Date(c.last_need_update).getTime() > DOCE_H_MS,
  )
  const conWalkIns = centros.filter(c => c.walk_ins > 0)

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-950">Métricas</h1>
        <a href="/admin" className="text-sm text-blue-700 underline">← Admin</a>
      </div>
      <p className="text-xs text-gray-500 -mt-6">
        Solo centros activos. Actualizado en cada carga.
      </p>

      {/* ── INSCRIPCIONES ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-950 mb-3">Inscripciones</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <p className="text-4xl font-bold text-gray-950 tabular-nums">{m.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <p className="text-4xl font-bold text-gray-950 tabular-nums">{m.ultimas_24h}</p>
            <p className="text-sm text-gray-500 mt-1">Últimas 24 h</p>
          </div>
        </div>

        {buckets.length > 0 ? (
          <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-white">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Por hora — últimas 24 h (hora Bogotá)
            </p>
            <div className="space-y-1.5">
              {buckets.map(b => {
                const pct = Math.round((b.conteo / maxBucket) * 100)
                return (
                  <div key={new Date(b.hora_bogota).toISOString()} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-gray-500 tabular-nums shrink-0">
                      {fmtHora(new Date(b.hora_bogota))}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden min-w-0">
                      <div
                        className="bg-blue-600 h-5 rounded-full"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                    <span className="w-5 tabular-nums text-gray-700 text-right shrink-0">
                      {b.conteo}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Sin inscripciones en las últimas 24 h.</p>
        )}
      </section>

      {/* ── TASAS ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-950 mb-1">Tasas</h2>
        <p className="text-xs text-gray-500 mb-3">
          Confirmación: turnos ya iniciados, sin cancelados.
          Asistencia: confirmados de turnos ya terminados.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            {confPct !== null ? (
              <>
                <p className="text-4xl font-bold text-gray-950 tabular-nums">{confPct}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  Confirmación — {m.conf_num} de {m.conf_denom}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-gray-400">Sin datos aún</p>
                <p className="text-sm text-gray-400 mt-1">Confirmación</p>
              </>
            )}
          </div>
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            {asistPct !== null ? (
              <>
                <p className="text-4xl font-bold text-gray-950 tabular-nums">{asistPct}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  Asistencia — {m.asist_num} de {m.asist_denom}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-gray-400">Sin datos aún</p>
                <p className="text-sm text-gray-400 mt-1">Asistencia</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── WALK-INS ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-950 mb-1">Walk-ins por centro</h2>
        <p className="text-xs text-gray-500 mb-3">
          Personas agregadas en el momento por el coordinador (<code className="bg-gray-100 px-1 rounded text-xs">is_walk_in = true</code>).
        </p>
        {conWalkIns.length === 0 ? (
          <p className="text-sm text-gray-500">Sin walk-ins registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-600">
                  <th className="px-3 py-2 font-semibold">Centro</th>
                  <th className="px-3 py-2 font-semibold text-right">Walk-ins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {conWalkIns.map(c => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-gray-900">{c.name}</td>
                    <td className="px-3 py-2 tabular-nums font-bold text-right">{c.walk_ins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── NECESIDADES DESACTUALIZADAS ─────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-950 mb-1">
          Necesidades sin actualizar (+12 h)
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Centros activos sin actualización de necesidades en más de 12 h, o sin ninguna cargada.
        </p>
        {desactualizados.length === 0 ? (
          <p className="text-sm text-green-700 font-medium">
            Todos los centros tienen sus necesidades al día.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-600">
                  <th className="px-3 py-2 font-semibold">Centro</th>
                  <th className="px-3 py-2 font-semibold">Coordinador</th>
                  <th className="px-3 py-2 font-semibold">WhatsApp</th>
                  <th className="px-3 py-2 font-semibold">Última act.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {desactualizados.map(c => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-gray-900">{c.name}</td>
                    <td className="px-3 py-2 text-gray-700">{c.coordinator_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      {c.whatsapp_contact ? (
                        <a
                          href={`https://wa.me/${c.whatsapp_contact.replace(/^\+/, '')}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-green-700 underline font-mono text-xs"
                        >
                          {c.whatsapp_contact}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {c.last_need_update
                        ? haceCuanto(new Date(c.last_need_update))
                        : 'Sin datos'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
