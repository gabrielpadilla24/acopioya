import { notFound } from 'next/navigation'
import { sql }       from '@/lib/db'
import { FormCentro } from '../FormCentro'
import { actualizarCentro } from '../actions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditarCentroPage({ params }: Props) {
  const { id } = await params

  const [c] = await sql<{
    id: string; name: string; city: string; address: string; slug: string
    lat: number | null; lng: number | null; status: string
    whatsapp_contact: string | null; coordinator_name: string | null
    schedule_note: string | null
  }[]>`
    SELECT id, name, city, address, slug, lat, lng, status,
           whatsapp_contact, coordinator_name, schedule_note
    FROM centers
    WHERE id = ${id}
    LIMIT 1
  `
  if (!c) notFound()

  const coords = c.lat !== null && c.lng !== null ? `${c.lat}, ${c.lng}` : ''

  const action = actualizarCentro.bind(null, c.id)

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-on-surface mb-6">Editar: {c.name}</h1>
      <FormCentro
        action={action}
        defaultValues={{
          name:             c.name,
          slug:             c.slug,
          address:          c.address,
          city:             c.city,
          coords,
          status:           c.status,
          whatsapp_contact: c.whatsapp_contact,
          coordinator_name: c.coordinator_name,
          schedule_note:    c.schedule_note,
        }}
      />
    </main>
  )
}
