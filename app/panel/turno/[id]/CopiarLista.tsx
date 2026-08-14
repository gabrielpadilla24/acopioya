'use client'

import { useState } from 'react'

type Signup = { name: string; phone: string | null; state: string }

export function CopiarLista({ signups }: { signups: Signup[] }) {
  const [copied,   setCopied]   = useState(false)
  const [fallback, setFallback] = useState(false)

  const texto = signups
    .map(s => `${s.name} — ${s.phone ?? 'sin celular'} — ${s.state}`)
    .join('\n')

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFallback(true)
    }
  }

  return (
    <div>
      <button
        onClick={copiar}
        className="inline-flex items-center gap-2 px-4 min-h-[44px] border border-outline-variant rounded text-sm font-medium text-on-surface hover:bg-surface-container bg-surface-container-lowest"
      >
        {copied ? '✓ Copiado' : 'Copiar lista'}
      </button>

      {fallback && (
        <textarea
          readOnly
          value={texto}
          rows={Math.min(signups.length + 1, 8)}
          onClick={e => (e.target as HTMLTextAreaElement).select()}
          className="mt-2 w-full text-xs font-mono border border-outline-variant rounded p-2 bg-surface-container"
          aria-label="Lista de inscritos (selecciona y copia manualmente)"
        />
      )}
    </div>
  )
}
