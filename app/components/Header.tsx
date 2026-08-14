type Props = {
  variant?: 'full' | 'logo-only'
}

export default function Header({ variant = 'full' }: Props) {
  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">

        <a href="/" className="text-primary font-bold text-xl tracking-tight">
          AcopioYA
        </a>

        {variant === 'full' && (
          <>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="/donar" className="text-on-surface-variant hover:text-on-surface text-sm font-medium">
                Donar
              </a>
              <a href="/#centros" className="text-on-surface-variant hover:text-on-surface text-sm font-medium">
                Voluntariado
              </a>
              <a href="/#centros" className="text-on-surface-variant hover:text-on-surface text-sm font-medium">
                Centros
              </a>
              <a
                href="/entrar"
                className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded min-h-[40px] flex items-center hover:opacity-90 transition-opacity"
              >
                Entrar
              </a>
            </div>

            {/* Mobile hamburger — CSS only */}
            <details className="md:hidden relative">
              <summary className="list-none cursor-pointer p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface text-xl select-none">
                ☰
              </summary>
              <div className="absolute top-full right-0 w-64 bg-surface-container-lowest border border-outline-variant rounded shadow-lg p-4 space-y-1 mt-1 z-10">
                <a href="/donar" className="block py-2.5 px-3 text-sm font-medium text-on-surface hover:bg-surface rounded min-h-[44px] flex items-center">
                  Donar
                </a>
                <a href="/#centros" className="block py-2.5 px-3 text-sm font-medium text-on-surface hover:bg-surface rounded min-h-[44px] flex items-center">
                  Voluntariado
                </a>
                <a href="/#centros" className="block py-2.5 px-3 text-sm font-medium text-on-surface hover:bg-surface rounded min-h-[44px] flex items-center">
                  Centros
                </a>
                <a
                  href="/entrar"
                  className="block py-2.5 px-3 text-sm font-bold text-on-primary bg-primary rounded min-h-[44px] flex items-center justify-center mt-2"
                >
                  Entrar
                </a>
              </div>
            </details>
          </>
        )}

      </div>
    </header>
  )
}
