'use client'

import { useRouter }               from 'next/navigation'
import { useTransition }           from 'react'
import { quitarWalkIn }            from './actions'

export function QuitarWalkIn({ signupId, nombre }: { signupId: string; nombre: string }) {
  const router                       = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`¿Quitar el walk-in de ${nombre}? Se libera su cupo.`)) return

    startTransition(async () => {
      await quitarWalkIn(signupId)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="px-4 min-h-[44px] text-sm border border-error rounded text-error hover:bg-error-container disabled:opacity-60"
    >
      {isPending ? 'Quitando…' : 'Quitar'}
    </button>
  )
}
