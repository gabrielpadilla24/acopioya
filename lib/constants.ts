export const CATEGORIAS_NECESIDADES = [
  'agua',
  'alimentos no perecederos',
  'aseo personal',
  'medicamentos/primeros auxilios',
  'cobijas/colchonetas',
  'pañales',
  'alimento para mascotas',
  'cajas/cinta de embalaje',
] as const

export type CategoriaNecesidad = (typeof CATEGORIAS_NECESIDADES)[number]

export const NIVELES = {
  urgent:       { emoji: '🔴', label: 'URGENTE' },
  needed:       { emoji: '🟡', label: 'SE NECESITA' },
  enough:       { emoji: '🟢', label: 'SUFICIENTE' },
  do_not_bring: { emoji: '⛔', label: 'NO TRAER' },
} as const

export type Nivel = keyof typeof NIVELES

export const ROLES = {
  clasificacion: 'Clasificación',
  recepcion:     'Recepción',
  cargue:        'Cargue/descargue',
  profesional:   'Profesional',
} as const

export type Rol = keyof typeof ROLES

export const ESTADOS_CENTRO = {
  open:   'ABIERTO',
  full:   'LLENO',
  closed: 'CERRADO',
} as const

export type EstadoCentro = keyof typeof ESTADOS_CENTRO
