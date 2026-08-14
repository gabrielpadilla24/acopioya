import { obtenerSignupPorToken }         from '@/lib/queries'
import { ROLES, type Rol }               from '@/lib/constants'
import { esHoy, esMañana, rangoHorario,
         formatearFecha, formatearHora } from '@/lib/time'

type Props = {
  params:       Promise<{ slug: string; id: string }>
  searchParams: Promise<{ t?: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acopioya.vercel.app'

function mensajeGenerico(slug: string) {
  return (
    <main className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-bold text-gray-950">¡Gracias!</h1>
      <p className="mt-3 text-gray-700">Tu inscripción fue recibida.</p>
      <a href={`/c/${slug}`} className="mt-6 inline-block text-blue-700 underline text-sm">
        ← Volver al centro
      </a>
    </main>
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

  // Etiqueta de fecha para mostrar y para el mensaje de WhatsApp
  let diaLabel: string
  if (esHoy(inicio))    diaLabel = 'hoy'
  else if (esMañana(inicio)) diaLabel = 'mañana'
  else                  diaLabel = formatearFecha(inicio)
  const rango   = rangoHorario(inicio, fin)
  const etiqueta = `${diaLabel}, ${rango}`

  // Hora desde la que podrá confirmar (starts_at − 4h)
  const inicioConfirmacion = new Date(inicio.getTime() - 4 * 60 * 60 * 1000)
  const horaConfirmacion   = formatearHora(inicioConfirmacion)

  // Mensaje de WhatsApp
  const waMsg = `Mi turno en ${sg.center_name} — ${rolLabel}, ${etiqueta}. Gestiona tu inscripción aquí: ${manageUrl}`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waMsg)}`

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <a href={`/c/${sg.center_slug}`} className="text-blue-700 text-sm">← Volver al centro</a>

      <div className="mt-4 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h1 className="text-2xl font-bold text-gray-950">¡Listo! Estás inscrito.</h1>
      </div>

      {/* 1 — Resumen */}
      <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-0.5">
        <p className="font-bold text-gray-950">{sg.center_name}</p>
        <p className="text-gray-800">
          {rolLabel}
          {sg.role_detail && <span className="text-gray-600"> — {sg.role_detail}</span>}
        </p>
        <p className="text-gray-700">{etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)}</p>
        <p className="text-gray-600 text-sm">{sg.center_address}, {sg.center_city}</p>
      </div>

      {/* 2 — Caja de confirmación */}
      <div className="mt-4 bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
        <p className="font-bold text-amber-900 text-sm">
          ⚠️ Entre 4 y 2 horas antes del turno debes confirmar que vas, desde tu enlace.
          Si no confirmas, tu cupo se libera para otra persona.
        </p>
        <p className="mt-2 text-amber-800 text-sm">
          Podrás confirmar desde las <strong>{horaConfirmacion}</strong>.
        </p>
      </div>

      {/* 3 — WhatsApp compartir */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 min-h-[48px] w-full
                   bg-green-700 text-white font-bold rounded-xl text-base"
      >
        💬 Guardar mi enlace en WhatsApp
      </a>

      {/* 4 — Agregar al calendario */}
      <a
        href={`/api/ics/${t}`}
        className="mt-3 flex items-center justify-center gap-2 min-h-[48px] w-full
                   border border-gray-300 rounded-xl text-gray-900 font-medium bg-white text-base"
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
                     border border-green-400 rounded-xl text-green-800 font-medium bg-green-50 text-base"
        >
          💬 Unirme al grupo del turno
        </a>
      )}

      {/* 6 — Enlace de gestión como texto seleccionable */}
      <div className="mt-6 pt-5 border-t border-gray-200">
        <p className="text-sm text-gray-700 font-medium mb-1">
          Guarda este enlace, es tu única forma de gestionar tu inscripción:
        </p>
        <a href={manageUrl} className="text-blue-700 text-sm break-all underline font-mono">
          {manageUrl}
        </a>
      </div>
    </main>
  )
}
