export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { sql }              from '@/lib/db'
import { InvitacionForm }   from './InvitacionForm'

export const metadata: Metadata = {
  title: 'Activar acceso — AcopioYA',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

type Props = { params: Promise<{ token: string }> }

export default async function InvitacionPage({ params }: Props) {
  const { token } = await params

  const [invite] = await sql<{
    center_name: string
    username:    string
    used_at:     Date | null
    expires_at:  Date
  }[]>`
    SELECT c.name AS center_name, ci.username, ci.used_at, ci.expires_at
    FROM coordinator_invites ci
    JOIN centers c ON c.id = ci.center_id
    WHERE ci.token = ${token}
    LIMIT 1
  `

  const invalida = !invite || invite.used_at !== null || new Date(invite.expires_at) < new Date()

  if (invalida) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
        <div className="max-w-sm w-full text-center space-y-3">
          <p className="text-4xl">🔒</p>
          <h1 className="text-xl font-bold text-on-surface">Invitación no válida</h1>
          <p className="text-on-surface-variant text-sm">
            Esta invitación ya se usó o venció. Pídele una nueva al administrador.
          </p>
          <a href="/" className="inline-block text-sm text-secondary hover:underline mt-2">
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <a href="/" className="text-primary font-bold text-2xl tracking-tight">
            AcopioYA
          </a>
          <p className="mt-1 text-on-surface-variant text-sm">Activar acceso de coordinador</p>
        </div>

        <div className="mb-5 p-4 bg-surface-container rounded border border-outline-variant">
          <p className="text-xs text-on-surface-variant uppercase tracking-wide font-semibold mb-1">Centro</p>
          <p className="font-bold text-on-surface">{invite.center_name}</p>
          <p className="text-xs text-on-surface-variant uppercase tracking-wide font-semibold mt-3 mb-1">Usuario asignado</p>
          <p className="font-mono text-on-surface">{invite.username}</p>
        </div>

        <InvitacionForm token={token} />
      </div>
    </div>
  )
}
