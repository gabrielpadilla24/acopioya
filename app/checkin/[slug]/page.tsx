import type { Metadata }    from 'next'
import { notFound }         from 'next/navigation'
import { sql }              from '@/lib/db'
import { FormCheckin }      from './FormCheckin'
import Header               from '@/app/components/Header'

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
    <div className="min-h-screen flex flex-col">
      <Header variant="logo-only" />

      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
        {!centro.is_active && (
          <div role="alert" className="mx-4 mt-6 p-4 bg-warning-container border border-warning rounded">
            <p className="font-semibold text-on-warning-container">Este centro está pausado</p>
            <p className="text-on-warning-container text-sm mt-1">
              No está recibiendo voluntarios nuevos.
              Si ya te inscribiste, puedes registrar tu llegada normalmente.
            </p>
          </div>
        )}
        <FormCheckin slug={centro.slug} centerName={centro.name} />
      </div>
    </div>
  )
}
