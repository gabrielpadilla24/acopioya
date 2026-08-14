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

const STATUS_CLS: Record<string, string> = {
  open:   'bg-tertiary-container text-on-tertiary-container',
  full:   'bg-warning-container text-on-warning-container',
  closed: 'bg-surface-container text-on-surface-variant',
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
      <h1 className="text-2xl font-bold text-on-surface mb-4">Centros de acopio</h1>

      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full text-sm">
          <thead className="bg-surface-container">
            <tr className="border-b border-outline-variant text-left text-xs text-on-surface-variant">
              <th className="px-3 py-3 font-semibold">Nombre</th>
              <th className="px-3 py-3 font-semibold">Ciudad</th>
              <th className="px-3 py-3 font-semibold">Estado</th>
              <th className="px-3 py-3 font-semibold">Activo</th>
              <th className="px-3 py-3 font-semibold text-right">Turnos</th>
              <th className="px-3 py-3 font-semibold text-right">Inscritos</th>
              <th className="px-3 py-3 font-semibold">Verificado</th>
              <th className="px-3 py-3 font-semibold">Coordinador</th>
              <th className="px-3 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
            {centros.map(c => (
              <tr
                key={c.id}
                className={c.is_active ? '' : 'bg-surface-container text-on-surface-variant'}
              >
                <td className="px-3 py-3 font-medium text-on-surface">{c.name}</td>
                <td className="px-3 py-3 text-on-surface-variant text-xs">{c.city}</td>
                <td className="px-3 py-3">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[c.status] ?? 'bg-surface-container text-on-surface-variant'}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.is_active
                      ? 'bg-tertiary-container text-on-tertiary-container'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {c.is_active ? 'Activo' : 'Pausado'}
                  </span>
                </td>
                <td className="px-3 py-3 tabular-nums font-mono text-right text-on-surface">
                  {c.turnos_abiertos}
                </td>
                <td className="px-3 py-3 tabular-nums font-mono text-right text-on-surface">
                  {c.inscripciones}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                  {fmtBogota(c.verified_at)}
                </td>

                {/* Columna coordinador */}
                <td className="px-3 py-3 min-w-[200px]">
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
                    <a href={`/admin/centros/${c.id}`} className="text-secondary underline">
                      Editar
                    </a>
                    <form action={alternarActivo.bind(null, c.id)}>
                      <button type="submit" className="text-on-surface-variant underline">
                        {c.is_active ? 'Pausar' : 'Activar'}
                      </button>
                    </form>
                    <RegenerarTokenForm centerId={c.id} siteUrl={siteUrl} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
