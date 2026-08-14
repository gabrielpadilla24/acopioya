import { obtenerSignupPorToken }         from '@/lib/queries'
import { ROLES, type Rol }               from '@/lib/constants'
import { esHoy, esMañana, rangoHorario,
         formatearFecha, formatearHora } from '@/lib/time'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

type Props = {
  params:       Promise<{ slug: string; id: string }>
  searchParams: Promise<{ t?: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acopioya.vercel.app'

function mensajeGenerico(slug: string) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-on-surface">¡Gracias!</h1>
        <p className="mt-3 text-on-surface-variant">Tu inscripción fue recibida.</p>
        <a href={`/c/${slug}`} className="mt-6 inline-block text-secondary underline text-sm">
          ← Volver al centro
        </a>
      </main>
      <Footer />
    </div>
  )
}

export default async function ListoPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { t }   = await searchParams

  if (!t) return mensajeGenerico(slug)

  const sg = await obtenerSignupPorToken(t)
  if (!sg) return mensajeGenerico(slug)

  const inicio    = new Date(sg.starts_at)
  const fin       = new Date(sg.ends_at)
  const rolLabel  = ROLES[sg.role as Rol] ?? sg.role
  const manageUrl = `${SITE_URL}/v/${t}`

  let diaLabel: string
  if (esHoy(inicio))         diaLabel = 'hoy'
  else if (esMañana(inicio)) diaLabel = 'mañana'
  else                       diaLabel = formatearFecha(inicio)
  const rango    = rangoHorario(inicio, fin)
  const etiqueta = `${diaLabel}, ${rango}`

  const inicioConfirmacion = new Date(inicio.getTime() - 4 * 60 * 60 * 1000)
  const horaConfirmacion   = formatearHora(inicioConfirmacion)

  const waMsg = `Mi turno en ${sg.center_name} — ${rolLabel}, ${etiqueta}. Gestiona tu inscripción aquí: ${manageUrl}`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waMsg)}`

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <a href={`/c/${sg.center_slug}`} className="text-secondary text-sm">← Volver al centro</a>

        <div className="mt-4 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-2xl font-bold text-on-surface">¡Listo! Estás inscrito.</h1>
        </div>

        {/* 1 — Resumen */}
        <div className="mt-5 bg-surface-container border border-outline-variant rounded p-4 space-y-0.5">
          <p className="font-bold text-on-surface">{sg.center_name}</p>
          <p className="text-on-surface">
            {rolLabel}
            {sg.role_detail && <span className="text-on-surface-variant"> — {sg.role_detail}</span>}
          </p>
          <p className="text-on-surface">{etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)}</p>
          <p className="text-on-surface-variant text-sm">{sg.center_address}, {sg.center_city}</p>
        </div>

        {/* 2 — Caja de confirmación */}
        <div className="mt-4 bg-warning-container border-2 border-warning rounded p-4">
          <p className="font-bold text-on-warning-container text-sm">
            ⚠️ Entre 4 y 2 horas antes del turno debes confirmar que vas, desde tu enlace.
            Si no confirmas, tu cupo se libera para otra persona.
          </p>
          <p className="mt-2 text-on-warning-container text-sm">
            Podrás confirmar desde las <strong>{horaConfirmacion}</strong>.
          </p>
        </div>

        {/* 3 — WhatsApp compartir */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 min-h-[48px] w-full
                     bg-tertiary text-on-tertiary font-bold rounded text-base"
        >
          💬 Guardar mi enlace en WhatsApp
        </a>

        {/* 4 — Agregar al calendario */}
        <a
          href={`/api/ics/${t}`}
          className="mt-3 flex items-center justify-center gap-2 min-h-[48px] w-full
                     border border-outline-variant rounded text-on-surface font-medium bg-surface-container-lowest text-base"
        >
          📅 Agregar a mi calendario
        </a>

        {/* 5 — Grupo de WhatsApp del turno */}
        {sg.whatsapp_group_url && (
          <a
            href={sg.whatsapp_group_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 min-h-[48px] w-full
                       border border-tertiary rounded text-on-tertiary-container font-medium bg-tertiary-container text-base"
          >
            💬 Unirme al grupo del turno
          </a>
        )}

        {/* 6 — Enlace de gestión */}
        <div className="mt-6 pt-5 border-t border-outline-variant">
          <p className="text-sm text-on-surface font-medium mb-1">
            Guarda este enlace, es tu única forma de gestionar tu inscripción:
          </p>
          <a href={manageUrl} className="text-secondary text-sm break-all underline font-mono">
            {manageUrl}
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
}
