import { sql }               from '@/lib/db'
import { RegenerarTokenForm } from './RegenerarTokenForm'
import { CrearAccesoForm, RegenerarAccesoForm } from './CoordAccesoAdmin'
import { alternarActivo }     from './centros/actions'

export const dynamic = 'force-dynamic'

type CentroFila = {
  id:                  string
  slug:                string
  name:                string
  city:                string
  status:              'open' | 'full' | 'closed'
  is_active:           boolean
  admin_token:         string
  verified_at:         Date | null
  turnos_abiertos:     number
  inscripciones:       number
  coord_user_id:       string | null
  coord_username:      string | null
  coord_has_password:  boolean
  coord_last_login_at: Date | null
}

const STATUS_LABEL: Record<string, string> = {
  open:   'Abierto',
  full:   'Lleno',
  closed: 'Cerrado',
}

function fmtBogota(d: Date | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    timeZone:  'America/Bogota',
    day:       '2-digit',
    month:     '2-digit',
    year:      'numeric',
    hour:      '2-digit',
    minute:    '2-digit',
    hour12:    false,
  }).format(new Date(d))
}

export default async function AdminPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acopioya.vercel.app'

  const centros = await sql<CentroFila[]>`
    SELECT
      c.id, c.slug, c.name, c.city, c.status, c.is_active,
      c.admin_token, c.verified_at,
      COUNT(DISTINCT sh.id) FILTER (
        WHERE sh.starts_at > now() AND sh.status = 'open'
      )::int AS turnos_abiertos,
      COUNT(DISTINCT s.id)::int AS inscripciones,
      cu.id                        AS coord_user_id,
      cu.username                  AS coord_username,
      (cu.password_hash IS NOT NULL) AS coord_has_password,
      cu.last_login_at             AS coord_last_login_at
    FROM centers c
    LEFT JOIN shifts  sh ON sh.center_id = c.id
    LEFT JOIN signups s  ON s.shift_id   = sh.id
    LEFT JOIN coordinator_users cu ON cu.center_id = c.id AND cu.is_active = true
    GROUP BY
      c.id, c.slug, c.name, c.city, c.status,
      c.is_active, c.admin_token, c.verified_at,
      cu.id, cu.username, cu.password_hash, cu.last_login_at
    ORDER BY c.name
  `

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-950">Admin AcopioYA</h1>
        <div className="flex gap-2">
          <a
            href="/admin/metricas"
            className="px-4 py-2 bg-gray-700 text-white text-sm font-bold rounded-lg hover:bg-gray-800"
          >
            Métricas
          </a>
          <a
            href="/admin/centros/nuevo"
            className="px-4 py-2 bg-blue-700 text-white text-sm font-bold rounded-lg hover:bg-blue-800"
          >
            + Nuevo centro
          </a>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
              <th className="px-3 py-3 font-semibold">Nombre</th>
              <th className="px-3 py-3 font-semibold">Ciudad</th>
              <th className="px-3 py-3 font-semibold">Estado</th>
              <th className="px-3 py-3 font-semibold">Activo</th>
              <th className="px-3 py-3 font-semibold">Turnos</th>
              <th className="px-3 py-3 font-semibold">Inscritos</th>
              <th className="px-3 py-3 font-semibold">Verificado</th>
              <th className="px-3 py-3 font-semibold">Coordinador</th>
              <th className="px-3 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {centros.map(c => {
              return (
                <tr key={c.id} className={c.is_active ? '' : 'bg-gray-50 text-gray-500'}>
                  <td className="px-3 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-3 py-3">{c.city}</td>
                  <td className="px-3 py-3">{STATUS_LABEL[c.status] ?? c.status}</td>
                  <td className="px-3 py-3">{c.is_active ? 'Sí' : 'No'}</td>
                  <td className="px-3 py-3 tabular-nums">{c.turnos_abiertos}</td>
                  <td className="px-3 py-3 tabular-nums">{c.inscripciones}</td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {fmtBogota(c.verified_at)}
                  </td>

                  {/* Columna coordinador */}
                  <td className="px-3 py-3 min-w-[180px]">
                    {c.coord_user_id && c.coord_username ? (
                      <RegenerarAccesoForm
                        centerId={c.id}
                        userId={c.coord_user_id}
                        username={c.coord_username}
                        hasPassword={c.coord_has_password}
                        lastLoginAt={c.coord_last_login_at}
                        siteUrl={siteUrl}
                      />
                    ) : (
                      <CrearAccesoForm
                        centerId={c.id}
                        slug={c.slug}
                        siteUrl={siteUrl}
                      />
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      <a href={`/admin/centros/${c.id}`} className="text-blue-700 underline">
                        Editar
                      </a>
                      <form action={alternarActivo.bind(null, c.id)}>
                        <button type="submit" className="text-gray-600 underline">
                          {c.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </form>
                      <RegenerarTokenForm centerId={c.id} siteUrl={siteUrl} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
