'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print px-6 py-3 bg-blue-700 text-white font-bold rounded-xl text-base hover:bg-blue-800"
    >
      🖨️ Imprimir
    </button>
  )
}
