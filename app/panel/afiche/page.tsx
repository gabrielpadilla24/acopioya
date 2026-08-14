import { notFound }       from 'next/navigation'
import qrcode             from 'qrcode'
import { sql }            from '@/lib/db'
import { requiereSesion } from '@/lib/auth'
import { PrintButton }    from './PrintButton'

export const dynamic = 'force-dynamic'

export default async function AfichePage() {
  const sesion = await requiereSesion()

  const [centro] = await sql<{ name: string; slug: string }[]>`
    SELECT name, slug FROM centers
    WHERE id = ${sesion.user.centerId}
    LIMIT 1
  `
  if (!centro) notFound()

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acopioya.vercel.app'
  const checkinUrl = `${siteUrl}/checkin/${centro.slug}`

  const svgRaw = await qrcode.toString(checkinUrl, {
    type:                 'svg',
    errorCorrectionLevel: 'M',
    margin:               2,
  })
  const svg = svgRaw
    .replace(/width="\d+(\.\d+)?"/, 'width="100%"')
    .replace(/height="\d+(\.\d+)?"/, 'height="auto"')

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: letter portrait; margin: 1.5cm; }
        @media print {
          .no-print            { display: none !important; }
          body                 { background: white !important; margin: 0; }
          *                    { box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .afiche-wrap         { min-height: 0 !important; height: auto !important;
                                 page-break-inside: avoid; break-inside: avoid; }
          .afiche-qr           { width: 65% !important; max-width: 65% !important; margin: 0 auto; }
        }
      `}} />

      <div className="no-print flex gap-3 px-8 pt-6">
        <a href="/panel" className="text-secondary text-sm underline">
          ← Volver al panel
        </a>
      </div>

      <div className="afiche-wrap min-h-screen bg-white flex flex-col items-center justify-center gap-5 px-8 py-8 text-center">
        <PrintButton />

        <h1 className="text-5xl font-black text-on-surface leading-tight max-w-lg">
          {centro.name}
        </h1>

        <p className="text-xl font-bold text-on-surface-variant uppercase tracking-widest max-w-sm">
          VOLUNTARIO: escanea al llegar para registrar tu asistencia
        </p>

        {/* QR — grande en pantalla, 65% del ancho imprimible en papel carta */}
        <div
          className="afiche-qr w-80 sm:w-[28rem]"
          dangerouslySetInnerHTML={{ __html: svg }}
          aria-label={`Código QR para check-in en ${centro.name}`}
        />

        <p className="text-base text-on-surface-variant font-mono break-all max-w-sm">
          {checkinUrl}
        </p>

        <p className="text-sm text-on-surface-variant">AcopioYA</p>
      </div>
    </>
  )
}
