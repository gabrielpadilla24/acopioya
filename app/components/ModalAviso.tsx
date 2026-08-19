'use client'

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'acopioya_aviso_v1'

export function ModalAviso() {
  const [visible, setVisible] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    previousFocusRef.current = document.activeElement as HTMLElement
    closeBtnRef.current?.focus()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') cerrar()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible])

  function cerrar() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    previousFocusRef.current?.focus()
  }

  if (!visible) return null

  return (
    /* z-[1200]: por encima del header (z-[1100]) y de Leaflet (z-1000) */
    <div
      className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) cerrar() }}
    >
      {/* Fondo semitransparente */}
      <div
        className="absolute inset-0 bg-on-surface/60"
        aria-hidden="true"
        onClick={cerrar}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-aviso-titulo"
        className="relative w-full sm:max-w-lg bg-surface-container-lowest rounded-[4px] px-6 pt-6 pb-8 shadow-lg mx-0 sm:mx-4"
      >
        {/* Botón X */}
        <button
          ref={closeBtnRef}
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-[4px]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>

        <h2
          id="modal-aviso-titulo"
          className="text-2xl font-bold text-on-surface pr-12"
        >
          Gracias, Bogotá.
        </h2>

        <div className="mt-4 space-y-3 text-on-surface-variant text-[15px] leading-relaxed">
          <p>
            Se recogieron más de 1.800 toneladas de ayuda humanitaria para las familias
            afectadas por el terremoto. La respuesta superó lo que los centros podían procesar.
          </p>
          <p>
            Por eso la Alcaldía y la Cruz Roja suspendieron temporalmente la recepción de
            donaciones, y retiramos la mayoría de puntos de la plataforma hasta nuevo aviso.
          </p>
          <p>
            Algunos centros independientes siguen recibiendo y los puedes ver abajo.
          </p>
          <p>
            Si coordinas un centro que sigue abierto,{' '}
            <a
              href="mailto:gabrielpadillab03@gmail.com?subject=Centro%20activo%20en%20AcopioYA"
              className="text-secondary underline"
            >
              escríbenos
            </a>
            {' '}y lo publicamos.
          </p>
        </div>

        <div className="mt-6">
          <button
            onClick={cerrar}
            className="w-full px-6 min-h-[48px] bg-primary text-on-primary font-bold rounded-[4px] text-sm"
          >
            Ver centros abiertos
          </button>
        </div>
      </div>
    </div>
  )
}
