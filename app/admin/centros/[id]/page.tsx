import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { FormEditarCentro } from './FormEditarCentro'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditarCentroPage({ params }: Props) {
  const { id } = await params

  const [centro] = await sql<{
    id: string
    name: string
    city: string
    address: string
    slug: string
    coordinator_name: string | null
  }[]>`
    SELECT id, name, city, address, slug, coordinator_name
    FROM centers
    WHERE id = ${id}
    LIMIT 1
  `
  if (!centro) notFound()

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-4">
        <a href="/admin" className="text-blue-700 text-sm underline">← Volver al admin</a>
      </div>
      <h1 className="text-xl font-bold text-gray-950 mb-6">Editar: {centro.name}</h1>
      <FormEditarCentro centro={centro} />
    </main>
  )
}
