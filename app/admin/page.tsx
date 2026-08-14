import { sql } from '@/lib/db'
import { RegenerarTokenForm } from './RegenerarTokenForm'

export const dynamic = 'force-dynamic'

type CentroAdmin = {
  id: string
  slug: string
  name: string
  city: string
  status: 'open' | 'full' | 'closed'
  is_active: boolean
  admin_token: string
}

const STATUS_LABEL: Record<string, string> = {
  open:   'Abierto',
  full:   'Lleno',
  closed: 'Cerrado',
}

export default async function AdminPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acopioya.vercel.app'

  const centros = await sql<CentroAdmin[]>`
    SELECT id, slug, name, city, status, is_active, admin_token
    FROM centers
    ORDER BY name
  `

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-950 mb-6">Admin AcopioYA</h1>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700">Nombre</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Ciudad</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Activo</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Panel</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {centros.map(c => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-700">{c.city}</td>
                <td className="px-4 py-3 text-gray-700">{STATUS_LABEL[c.status] ?? c.status}</td>
                <td className="px-4 py-3 text-gray-700">{c.is_active ? 'Sí' : 'No'}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/panel/${c.admin_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline text-xs"
                  >
                    Ver panel →
                  </a>
                </td>
                <td className="px-4 py-3 space-y-1">
                  <a
                    href={`/admin/centros/${c.id}`}
                    className="block text-xs text-blue-700 underline"
                  >
                    Editar
                  </a>
                  <RegenerarTokenForm centerId={c.id} siteUrl={siteUrl} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
