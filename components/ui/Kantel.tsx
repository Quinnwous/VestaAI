'use client'

import { useRef } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'

/**
 * Subtiele 3D-kanteling die de muis volgt (max. `sterkte` graden), plus
 * `--mx`/`--my` voor een spotlight-laag. Puur versiering: zonder JavaScript,
 * op touch en onder `prefers-reduced-motion` staat het element gewoon recht
 * (CSS `.vui-kantel` in globals.css). Gebruik spaarzaam — één hero-moment per
 * pagina (docs/ontwerp/README.md § 1).
 */
export function Kantel({
  children,
  sterkte = 3,
  className,
  style,
}: {
  children: ReactNode
  /** Maximale kanteling in graden. */
  sterkte?: number
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const frame = useRef(0)

  const beweeg = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const { clientX, clientY } = e
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      const x = (clientX - r.left) / r.width - 0.5
      const y = (clientY - r.top) / r.height - 0.5
      el.dataset.actief = 'true'
      el.style.setProperty('--ry', `${(x * sterkte * 2).toFixed(2)}deg`)
      el.style.setProperty('--rx', `${(-y * sterkte * 2).toFixed(2)}deg`)
      el.style.setProperty('--mx', `${clientX - r.left}px`)
      el.style.setProperty('--my', `${clientY - r.top}px`)
    })
  }

  const laat = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(frame.current)
    el.dataset.actief = 'false'
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <div
      ref={ref}
      className={['vui-kantel', className].filter(Boolean).join(' ')}
      style={style}
      onPointerMove={beweeg}
      onPointerLeave={laat}
    >
      {children}
    </div>
  )
}
