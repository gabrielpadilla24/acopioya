export const revalidate = 3600

export default function PrivacidadPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-950 mb-1">Aviso de privacidad</h1>
      <p className="text-xs text-gray-500 mb-6">Última actualización: 14 de agosto de 2026</p>

      <div className="space-y-5 text-gray-800 text-sm leading-relaxed">
        <section>
          <h2 className="font-semibold text-gray-950 mb-1">¿Quién responde por tus datos?</h2>
          <p>
            Gabriel Padilla (persona natural), a través de este sitio web. Si tienes
            preguntas o quieres ejercer algún derecho, escríbele a{' '}
            <a href="mailto:gabrielpadillab03@gmail.com" className="underline text-blue-700">
              gabrielpadillab03@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-950 mb-1">¿Qué datos recopilamos?</h2>
          <p>Solo dos cosas: tu nombre completo y tu número de celular.</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-950 mb-1">¿Para qué los usamos?</h2>
          <p>
            Únicamente para coordinar tu participación como voluntario en el centro de
            acopio donde te inscribiste. El coordinador del centro puede ver tu nombre y
            celular para organizar los turnos y contactarte si hay cambios. Nadie más
            tiene acceso a esa información dentro de la plataforma.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-950 mb-1">¿Dónde se guardan?</h2>
          <p>
            Los datos se almacenan en Supabase (base de datos en la nube) y el sitio
            corre en Vercel. Ambos son proveedores externos con sus propias políticas de
            seguridad. No los compartimos con ninguna otra persona ni empresa más allá
            de estos dos proveedores de infraestructura.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-950 mb-1">¿Cuánto tiempo los guardamos?</h2>
          <p>
            Tus datos se borran automáticamente 90 días después de tu inscripción.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-950 mb-1">¿Qué derechos tienes?</h2>
          <p>
            De acuerdo con la Ley 1581 de 2012, puedes consultar los datos que
            guardamos sobre ti, pedir que los corrijamos si hay un error, o solicitar
            que los eliminemos antes de los 90 días. Para cualquiera de estas
            solicitudes escríbenos a{' '}
            <a href="mailto:gabrielpadillab03@gmail.com" className="underline text-blue-700">
              gabrielpadillab03@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-8">
        <a href="/" className="text-sm text-blue-700 underline">← Volver a los centros</a>
      </div>
    </main>
  )
}
