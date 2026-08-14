import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-5xl font-bold text-surface-container mb-4">404</p>
        <h1 className="text-2xl font-bold text-on-surface mb-2">No encontramos esta página</h1>
        <p className="text-on-surface-variant text-sm mb-8">
          El enlace puede haber cambiado o la dirección tiene un error.
        </p>
        <a
          href="/"
          className="px-5 py-3 bg-primary text-on-primary font-bold rounded text-sm inline-flex items-center min-h-[48px]"
        >
          Ver centros de acopio
        </a>
      </main>

      <Footer />
    </div>
  )
}
