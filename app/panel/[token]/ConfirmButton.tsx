'use client'

import { useTransition } from 'react'

export function ConfirmButton({
  action,
  confirmText,
  className,
  children,
}: {
  action:      () => Promise<void>
  confirmText: string
  className?:  string
  children:    React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      className={className}
      disabled={isPending}
      onClick={() => {
        if (window.confirm(confirmText)) {
          startTransition(() => { void action() })
        }
      }}
    >
      {isPending ? '…' : children}
    </button>
  )
}
