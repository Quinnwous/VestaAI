'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { colors, radius } from './tokens'

export interface SegOption<T extends string> {
  value: T
  label: string
}

/**
 * Segmented control (bv. NL/EN, Tabel/Kaart, Lang/Kort) in de kit-vorm
 * (docs/ontwerp/README.md § 1.6): grijze baan met een witte "thumb" die naar
 * de gekozen optie schuift. Tot de thumb gemeten is — of als JavaScript
 * faalt — draagt de actieve knop zelf de witte achtergrond, dus de keuze is
 * altijd zichtbaar.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  style?: CSSProperties
}) {
  const pad = size === 'sm' ? '6px 12px' : '8px 15px'
  const fs = size === 'sm' ? 12.5 : 13.5
  const baanRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const baan = baanRef.current
    if (!baan) return
    const meet = () => {
      const knop = baan.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (!knop) return setThumb(null)
      setThumb({ x: knop.offsetLeft, w: knop.offsetWidth })
    }
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(baan)
    return () => ro.disconnect()
  }, [value, options.length])

  return (
    <div
      ref={baanRef}
      role="group"
      className="vui-seg"
      data-gemeten={thumb ? 'true' : undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        padding: 3,
        gap: 2,
        borderRadius: radius.pill,
        background: '#EEF1F5',
        ...style,
      }}
    >
      {thumb && (
        <span
          aria-hidden
          className="vui-seg-thumb"
          style={{ left: 0, width: thumb.w, transform: `translateX(${thumb.x}px)` }}
        />
      )}
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: pad,
              fontSize: fs,
              fontWeight: active ? 700 : 600,
              border: 'none',
              borderRadius: radius.pill,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: active ? colors.surface : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(20,24,27,.14)' : 'none',
              color: active ? 'var(--merk-tekst)' : colors.bodyStrong,
              transition: 'color .15s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
