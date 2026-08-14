'use client'

import { useTransition } from 'react'

export function ConfirmButton({
  action,
  confirmText,
  className,
  'aria-label': ariaLabel,
  children,
}: {
  action:       () => Promise<void>
  confirmText:  string
  className?:   string
  'aria-label'?: string
  children:     React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      className={className}
      aria-label={ariaLabel}
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
