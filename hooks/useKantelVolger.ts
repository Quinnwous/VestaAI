'use client'

import { useEffect } from 'react'

/**
 * Lichte 3D-kanteling voor elk `.vl-kantel`-element op de pagina, met één
 * passieve listener (zelfde idee als useSpotlightVolger). Het element zelf
 * draagt `.vui-kantel` (CSS in globals.css: perspectief, overgang, en uit
 * onder reduced motion); hier worden alleen `--rx`/`--ry` gezet. Alleen met
 * een echte muis.
 */
export function useKantelVolger(sterkte = 2.5) {
  useEffect(() => {
    let actief: HTMLElement | null = null
    let frame = 0
    const zetTerug = (el: HTMLElement) => {
      el.dataset.actief = 'false'
      el.style.removeProperty('--rx')
      el.style.removeProperty('--ry')
    }
    const beweeg = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('.vl-kantel') ?? null
      if (actief && actief !== el) zetTerug(actief)
      actief = el
      if (!el) return
      const { clientX, clientY } = e
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = (clientX - r.left) / r.width - 0.5
        const y = (clientY - r.top) / r.height - 0.5
        el.dataset.actief = 'true'
        el.style.setProperty('--ry', `${(x * sterkte * 2).toFixed(2)}deg`)
        el.style.setProperty('--rx', `${(-y * sterkte * 2).toFixed(2)}deg`)
      })
    }
    const weg = () => { cancelAnimationFrame(frame); if (actief) { zetTerug(actief); actief = null } }
    document.addEventListener('pointermove', beweeg, { passive: true })
    document.documentElement.addEventListener('pointerleave', weg)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', beweeg)
      document.documentElement.removeEventListener('pointerleave', weg)
    }
  }, [sterkte])
}
