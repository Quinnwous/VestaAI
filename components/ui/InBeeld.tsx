'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/**
 * Zet `data-in-beeld` op "false" zodra de pagina gehydrateerd is en het
 * blok nog buiten beeld staat, en op "true" zodra het (deels) in beeld komt.
 * CSS start daar een eenmalige animatie op (bv. `.vl-bag` in globals.css).
 * Zonder JavaScript staat het attribuut er niet en is alles gewoon zichtbaar
 * — er blijft dus nooit iets verborgen (valkuil 19 sep).
 */
export function InBeeld({
  children,
  className,
  style,
  drempel = 0.35,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Welk deel in beeld moet zijn voordat de animatie start. */
  drempel?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [staat, setStaat] = useState<'true' | 'false' | undefined>(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStaat('true')
          io.disconnect()
        } else {
          setStaat(s => s ?? 'false')
        }
      },
      { threshold: drempel },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [drempel])

  return (
    <div ref={ref} className={className} style={style} data-in-beeld={staat}>
      {children}
    </div>
  )
}
