'use client'

import { useEffect } from 'react'

/**
 * Eén passieve pointer-listener voor de hele pagina: zet de muispositie als
 * `--mx`/`--my` op de `.vui-spot` onder de cursor (de gloed zelf is CSS, zie
 * globals.css § Bewegingssysteem). Tegels binnen een `<Spotlight>`-groep
 * regelt die groep zelf. Puur versiering — zonder JavaScript is er geen gloed.
 */
export function useSpotlightVolger() {
  useEffect(() => {
    const beweeg = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('.vui-spot')
      if (!el || el.closest('.vui-spot-groep')) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', beweeg, { passive: true })
    return () => document.removeEventListener('pointermove', beweeg)
  }, [])
}
