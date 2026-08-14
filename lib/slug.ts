export const SLUGS_RESERVADOS = new Set([
  'admin', 'panel', 'checkin', 'v', 'api', 'privacidad',
  'health', '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml',
])

export function normalizarSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
