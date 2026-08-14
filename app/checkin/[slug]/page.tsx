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

  const [centro] = await sql<{ name: string; slug: string }[]>`
    SELECT name, slug FROM centers
    WHERE slug = ${slug} AND is_active = true
    LIMIT 1
  `
  if (!centro) notFound()

  return (
    <div className="min-h-screen flex flex-col justify-center max-w-lg mx-auto">
      <FormCheckin slug={centro.slug} centerName={centro.name} />
    </div>
  )
}
