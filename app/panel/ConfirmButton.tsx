'use client'

import { useTransition } from 'react'

function Spinner() {
  return (
    <span
      className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    />
  )
}

export function ConfirmButton({
  action,
  confirmText,
  className,
  'aria-label': ariaLabel,
  children,
}: {
  action:        () => Promise<void>
  confirmText:   string
  className?:    string
  'aria-label'?: string
  children:      React.ReactNode
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
      {isPending ? <Spinner /> : children}
    </button>
  )
}
