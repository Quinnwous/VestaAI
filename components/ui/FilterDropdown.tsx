'use client'

/**
 * FilterDropdown — trigger-pil (label + samenvatting + tel-badge + chevron)
 * die een `Popover` opent, voor élke filterbalk (item 6.1, docs/ontwerp/README.md
 * § 3/4). Poort van `docs/ontwerp/kit.js` `dropdown()`. Gebruik:
 *   <FilterDropdown label="Prijs" samenvatting="€ 200k – 800k" aantalActief={1} onWis={...}>
 *     <RangeSlider .../>
 *   </FilterDropdown>
 * `voet` is standaard "Wis" + "Gereed"; geef `onWis` weg om "Wis" te verbergen
 * (bv. bij "Meer filters", die zijn eigen sectiegewijze wis-knoppen heeft).
 */

import { useState, type ReactNode } from 'react'
import { Popover } from './Popover'
import { Button } from './Button'
import { colors, radius } from './tokens'

export function FilterDropdown({
  label,
  samenvatting,
  aantalActief = 0,
  onWis,
  breedte = 320,
  uitlijning = 'start',
  children,
}: {
  label: string
  /** Korte tekst naast het label als het filter actief is, bv. "Wassenaar, +2". */
  samenvatting?: string
  /** Toont een rode tel-badge (docs/ontwerp/README.md § 1.2b: toegestane mini rode details). */
  aantalActief?: number
  onWis?: () => void
  breedte?: number
  uitlijning?: 'start' | 'center' | 'end'
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const actief = !!samenvatting || aantalActief > 0

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      titel={label}
      breedte={breedte}
      uitlijning={uitlijning}
      voet={
        <>
          {onWis && (
            <button
              type="button"
              onClick={onWis}
              style={{ background: 'none', border: 'none', color: colors.body, fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}
            >
              Wis
            </button>
          )}
          <Button variant="primary" size="sm" onClick={() => setOpen(false)}>Gereed</Button>
        </>
      }
      trigger={
        <button
          type="button"
          className="vui-filterbtn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 36,
            padding: '0 12px 0 14px',
            border: `1px solid ${actief ? 'var(--merk-rand)' : colors.borderStrong}`,
            background: actief ? 'var(--merk-zacht)' : colors.surface,
            color: actief ? 'var(--merk-diep)' : colors.bodyStrong,
            borderRadius: radius.pill,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <span>{label}</span>
          {samenvatting && (
            <span style={{ fontWeight: 700, color: 'var(--merk-diep)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {samenvatting}
            </span>
          )}
          {aantalActief > 0 && (
            <span
              style={{
                minWidth: 18, height: 18, padding: '0 5px', borderRadius: radius.pill,
                background: 'var(--merk-accent)', color: '#fff', fontSize: 11, fontWeight: 800,
                display: 'grid', placeItems: 'center', marginLeft: 2,
              }}
            >
              {aantalActief}
            </span>
          )}
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} width={12} height={12} style={{ opacity: .7, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .18s' }}>
            <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
          </svg>
        </button>
      }
    >
      {children}
    </Popover>
  )
}
