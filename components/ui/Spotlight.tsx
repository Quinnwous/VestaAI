'use client'

import type { CSSProperties, PointerEvent, ReactNode } from 'react'

/**
 * Spotlight-groep: één pointer-listener op de groep zet `--mx`/`--my` op elke
 * `.vui-spot` erin, relatief aan dat element. De gloed zelf is CSS
 * (`.vui-spot` in globals.css) en verschijnt alleen met een echte muis — op
 * touch en onder `prefers-reduced-motion` gebeurt er niets bijzonders. Zonder
 * hydratie staat alles er gewoon, alleen zonder gloed.
 */
export function Spotlight({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const beweeg = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const spots = e.currentTarget.querySelectorAll<HTMLElement>('.vui-spot')
    spots.forEach(el => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    })
  }
  return (
    <div className={['vui-spot-groep', className].filter(Boolean).join(' ')} style={style} onPointerMove={beweeg}>
      {children}
    </div>
  )
}
