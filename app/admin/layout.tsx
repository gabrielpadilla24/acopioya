export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-1">
          <span className="font-bold text-on-surface text-sm mr-4">Admin</span>
          <a
            href="/admin"
            className="px-3 py-1.5 text-sm text-secondary font-medium hover:bg-surface-container rounded"
          >
            Centros
          </a>
          <a
            href="/admin/metricas"
            className="px-3 py-1.5 text-sm text-secondary font-medium hover:bg-surface-container rounded"
          >
            Métricas
          </a>
          <a
            href="/admin/centros/nuevo"
            className="ml-auto px-3 py-1.5 text-sm bg-secondary text-on-primary font-medium rounded hover:opacity-90"
          >
            + Nuevo centro
          </a>
        </div>
      </nav>
      {children}
    </div>
  )
}
