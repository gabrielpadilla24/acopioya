'use client'

import { useState } from 'react'

const MAX = 140

export function FormAviso({
  currentNotice,
  guardar,
  quitar,
}: {
  currentNotice: string | null
  guardar: (formData: FormData) => Promise<void>
  quitar:  (_formData: FormData) => Promise<void>
}) {
  const [chars, setChars] = useState(currentNotice?.length ?? 0)
  const remaining = MAX - chars

  return (
    <div className="space-y-2">
      <form action={guardar} className="space-y-2">
        <textarea
          name="notice"
          maxLength={MAX}
          defaultValue={currentNotice ?? ''}
          onChange={e => setChars(e.target.value.length)}
          rows={3}
          placeholder="Aviso corto para los voluntarios…"
          className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-surface-container-lowest text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs tabular-nums ${remaining < 20 ? 'text-error' : 'text-on-surface-variant'}`}>
            {remaining} restantes
          </span>
          <button
            type="submit"
            className="px-4 min-h-[40px] bg-secondary text-on-primary text-sm font-bold rounded"
          >
            Publicar aviso
          </button>
        </div>
      </form>

      {currentNotice && (
        <form action={quitar}>
          <button
            type="submit"
            className="text-xs text-on-surface-variant underline hover:text-error"
          >
            Quitar aviso
          </button>
        </form>
      )}
    </div>
  )
}
