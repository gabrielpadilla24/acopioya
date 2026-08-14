'use client'

import { useRef } from 'react'

export function CopiarLinkPanel({ url }: { url: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(url).then(() => {
          if (!ref.current) return
          ref.current.textContent = '¡Copiado!'
          setTimeout(() => { if (ref.current) ref.current.textContent = 'Copiar link' }, 2000)
        })
      }
      className="block text-xs text-gray-600 underline cursor-pointer"
    >
      Copiar link
    </button>
  )
}
