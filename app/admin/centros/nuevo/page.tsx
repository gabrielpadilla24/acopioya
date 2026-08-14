import { FormCentro } from '../FormCentro'
import { crearCentro } from '../actions'

export const dynamic = 'force-dynamic'

export default function NuevoCentroPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acopioya.vercel.app'

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-on-surface mb-6">Nuevo centro</h1>
      <FormCentro action={crearCentro} siteUrl={siteUrl} />
    </main>
  )
}
