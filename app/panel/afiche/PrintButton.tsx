'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print px-6 py-3 bg-secondary text-on-primary font-bold rounded text-base hover:opacity-90"
    >
      Imprimir
    </button>
  )
}
