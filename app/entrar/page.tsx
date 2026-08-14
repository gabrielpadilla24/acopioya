export const dynamic = 'force-dynamic'

import { redirect }         from 'next/navigation'
import { obtenerSesion }    from '@/lib/auth'
import { LoginForm }        from './LoginForm'

export default async function EntrarPage() {
  const sesion = await obtenerSesion()
  if (sesion) redirect('/panel')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <a href="/" className="text-primary font-bold text-2xl tracking-tight">
            AcopioYA
          </a>
          <p className="mt-1 text-on-surface-variant text-sm">Panel de coordinación</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
