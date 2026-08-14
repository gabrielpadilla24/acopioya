type Props = {
  params:       Promise<{ slug: string; id: string }>
  searchParams: Promise<{ t?: string }>
}

export default async function ListoPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { t }   = await searchParams

  if (!t) {
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

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-950">¡Listo! Estás inscrito.</h1>
        <p className="mt-3 text-gray-700 leading-snug">
          Te esperamos en el turno. Guarda el siguiente enlace para ver o cancelar tu inscripción:
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-300 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-800 mb-3">Tu enlace de gestión:</p>
        <a
          href={`/v/${t}`}
          className="flex items-center justify-center min-h-[48px] bg-blue-700 text-white font-bold rounded-xl text-base text-center"
        >
          Ver mi inscripción →
        </a>
        <p className="mt-3 text-xs text-gray-500 text-center break-all font-mono">{t}</p>
      </div>

      <p className="mt-4 text-xs text-gray-600 text-center">
        Guarda este enlace — es la única forma de gestionar tu inscripción.
      </p>

      <div className="mt-8 text-center">
        <a href={`/c/${slug}`} className="text-blue-700 text-sm underline">← Volver al centro</a>
      </div>
    </main>
  )
}
