const TZ = 'America/Bogota'
const LOCALE = 'es-CO'

export function formatearFechaHora(d: Date): string {
  const dateParts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(d)

  const get = (t: string) => dateParts.find(p => p.type === t)?.value ?? ''

  return `${get('weekday')} ${get('day')} ${get('month')}, ${formatearHora(d)}`
}

export function formatearHora(d: Date): string {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d)

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''

  return `${get('hour')}:${get('minute')} ${get('dayPeriod')}`
}

export function rangoHorario(inicio: Date, fin: Date): string {
  return `${formatearHora(inicio)} – ${formatearHora(fin)}`
}

export function haceCuanto(d: Date): string {
  const seg = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seg < 60) return 'hace un momento'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const dias = Math.floor(hrs / 24)
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

export function esHoy(d: Date): boolean {
  const fmt = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(d) === fmt.format(new Date())
}

export function esMañana(d: Date): boolean {
  const fmt = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  // Bogotá no tiene horario de verano: +24 h siempre es el día siguiente allí
  return fmt.format(d) === fmt.format(new Date(Date.now() + 86_400_000))
}

export function formatearFecha(d: Date): string {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return `${get('weekday')} ${get('day')} ${get('month')}`
}

export function formatearDiaMes(d: Date): string {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
  }).formatToParts(d)
  const day   = parts.find(p => p.type === 'day')?.value ?? ''
  const month = (parts.find(p => p.type === 'month')?.value ?? '').replace(/\.$/, '')
  return `${day} ${month}`
}

// Para columnas DATE de postgres.js: se devuelven como midnight UTC.
// Usar timeZone: 'UTC' evita que el día retroceda al anterior en UTC-5.
export function formatearFechaSola(d: Date): string {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return `${get('day')} de ${get('month')} de ${get('year')}`
}
