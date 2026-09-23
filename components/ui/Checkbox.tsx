'use client'

/**
 * Checkbox — vinkje met optioneel telbadge (bv. aantal transacties), voor
 * multi-select-lijsten in een filterdropdown (plaats/wijk, woningtype). Poort
 * van `docs/ontwerp/kit.js` `vinkje()`. `indeterminate` voor een groep
 * waarvan een deel van de subs aangevinkt is. Gebruik:
 *   <Checkbox label="Wassenaar" checked={...} onChange={...} n={42} vet />
 */

import { useEffect, useRef } from 'react'
import { colors } from './tokens'

export function Checkbox({
  label,
  checked,
  onChange,
  n,
  vet = false,
  ingesprongen = false,
  indeterminate = false,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  /** Getoond rechts uitgelijnd, bv. het aantal transacties in die groep. */
  n?: number
  /** Groepsrij (bv. de woningtype-groep boven zijn subtypes) — vetgedrukt. */
  vet?: boolean
  /** Subrij — springt in onder zijn groep. */
  ingesprongen?: boolean
  indeterminate?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px',
        borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: vet ? 700 : 400,
        color: colors.bodyStrong, paddingLeft: ingesprongen ? 30 : 6,
      }}
      className="vui-navitem"
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          width: 18, height: 18, borderRadius: 6, border: `1.5px solid ${checked || indeterminate ? 'var(--merk)' : colors.borderStrong}`,
          background: checked || indeterminate ? 'var(--merk)' : colors.surface, display: 'grid', placeItems: 'center', flexShrink: 0,
        }}
      >
        {(checked || indeterminate) && (
          <svg viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={11} height={11}>
            {indeterminate && !checked ? <path d="M3 6h6" /> : <path d="m2.5 6.5 2.5 2.5 4.5-5" />}
          </svg>
        )}
      </span>
      <span>{label}</span>
      {n != null && <span style={{ marginLeft: 'auto', color: colors.muted, fontSize: 12 }}>{n}</span>}
    </label>
  )
}
