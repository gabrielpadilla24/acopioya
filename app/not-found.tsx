export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-950 mb-2">No encontramos esta página</h1>
      <p className="text-gray-600 text-sm mb-8">
        El enlace puede haber cambiado o la dirección tiene un error.
      </p>
      <a
        href="/"
        className="px-5 py-3 bg-blue-700 text-white font-bold rounded-xl text-sm inline-flex items-center min-h-[48px]"
      >
        Ver centros de acopio
      </a>
    </main>
  )
}
