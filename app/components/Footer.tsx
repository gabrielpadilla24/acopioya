export default function Footer() {
  const año = new Date().getFullYear()
  return (
    <footer className="border-t border-outline-variant py-6 mt-auto">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-on-surface-variant">
        <div className="flex gap-6">
          <span className="text-primary font-bold">AcopioYA</span>
          <a href="/privacidad" className="hover:text-on-surface min-h-[44px] flex items-center">
            Privacidad
          </a>
          <a href="mailto:gabrielpadillab03@gmail.com" className="hover:text-on-surface min-h-[44px] flex items-center">
            Contacto
          </a>
        </div>
        <p>© {año} AcopioYA</p>
      </div>
    </footer>
  )
}
