import { notFound } from 'next/navigation'
import qrcode       from 'qrcode'
import { sql }      from '@/lib/db'
import { PrintButton } from './PrintButton'

// Metadata y no-referrer heredados del layout /panel/[token]/layout.tsx

type Props = { params: Promise<{ token: string }> }

export default async function AfichePage({ params }: Props) {
  const { token } = await params

  const [centro] = await sql<{ name: string; slug: string }[]>`
    SELECT name, slug FROM centers
    WHERE admin_token = ${token}
    LIMIT 1
  `
  if (!centro) notFound()

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acopioya.vercel.app'
  const checkinUrl = `${siteUrl}/checkin/${centro.slug}`

  // SVG vectorial → imprime nítido a cualquier tamaño
  const svgRaw = await qrcode.toString(checkinUrl, {
    type:                 'svg',
    errorCorrectionLevel: 'M',
    margin:               2,
  })
  // Quitar dimensiones fijas para que el SVG escale con el contenedor
  const svg = svgRaw
    .replace(/width="\d+(\.\d+)?"/, 'width="100%"')
    .replace(/height="\d+(\.\d+)?"/, 'height="auto"')

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: letter; margin: 1cm; }
        @media print {
          .no-print { display: none !important; }
          body        { background: white !important; }
          *           { box-shadow: none !important; }
        }
      `}} />

      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-8 py-10 text-center">
        <PrintButton />

        <h1 className="text-4xl font-black text-gray-950 leading-tight max-w-lg">
          {centro.name}
        </h1>

        <p className="text-lg font-bold text-gray-700 uppercase tracking-wide max-w-sm">
          VOLUNTARIO: escanea al llegar para registrar tu asistencia
        </p>

        {/* QR — mínimo 10 cm en papel carta, ocupa ~60% del ancho imprimible */}
        <div
          className="w-72 sm:w-96 print:w-[60%]"
          dangerouslySetInnerHTML={{ __html: svg }}
          aria-label={`Código QR para check-in en ${centro.name}`}
        />

        <p className="text-sm text-gray-500 font-mono break-all max-w-sm">
          {checkinUrl}
        </p>

        <p className="text-xs text-gray-400 mt-4">AcopioYA</p>
      </div>
    </>
  )
}
