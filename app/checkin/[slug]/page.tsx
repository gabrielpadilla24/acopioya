import type { Metadata }    from 'next'
import { notFound }         from 'next/navigation'
import { sql }              from '@/lib/db'
import { FormCheckin }      from './FormCheckin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Check-in — AcopioYA',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ slug: string }> }

export default async function CheckinPage({ params }: Props) {
  const { slug } = await params

  const [centro] = await sql<{ name: string; slug: string; is_active: boolean }[]>`
    SELECT name, slug, is_active FROM centers
    WHERE slug = ${slug}
    LIMIT 1
  `
  if (!centro) notFound()

  return (
    <div className="min-h-screen flex flex-col justify-center max-w-lg mx-auto">
      {!centro.is_active && (
        <div role="alert" className="mx-4 mt-6 p-4 bg-amber-50 border border-amber-400 rounded-xl">
          <p className="font-semibold text-amber-900">Este centro está pausado</p>
          <p className="text-amber-800 text-sm mt-1">
            No está recibiendo voluntarios nuevos.
            Si ya te inscribiste, puedes registrar tu llegada normalmente.
          </p>
        </div>
      )}
      <FormCheckin slug={centro.slug} centerName={centro.name} />
    </div>
  )
}
