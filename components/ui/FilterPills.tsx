'use client'

/**
 * FilterPills — rij actieve-filterpillen onder de FilterBar, elk met een ×
 * om dat ene filter te verwijderen, plus "Wis alles" vanaf twee pillen
 * (item 6.1, docs/ontwerp/kit.js `filterPills()`). Gebruik:
 *   <FilterPills pillen={[{ label: 'Prijs', waarde: '€ 200k – 800k', onVerwijder: ... }]} onWisAlles={...} />
 */

import { colors, radius } from './tokens'

export type FilterPil = { label: string; waarde: string; onVerwijder: () => void }

export function FilterPills({ pillen, onWisAlles }: { pillen: FilterPil[]; onWisAlles: () => void }) {
  if (pillen.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {pillen.map((p, i) => (
        <span
          key={`${p.label}-${i}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 6px 0 11px',
            background: 'var(--merk-zacht)', border: '1px solid var(--merk-rand)', color: 'var(--merk-diep)',
            fontWeight: 600, fontSize: 12.5, borderRadius: radius.pill,
          }}
        >
          {p.label}: <b style={{ fontWeight: 800 }}>{p.waarde}</b>
          <button
            type="button"
            onClick={p.onVerwijder}
            aria-label={`${p.label}-filter verwijderen`}
            className="vui-pill-remove"
            style={{
              width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center',
              color: 'var(--merk-diep)', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
            }}
          >
            ×
          </button>
        </span>
      ))}
      {pillen.length > 1 && (
        <button
          type="button"
          onClick={onWisAlles}
          style={{ fontSize: 13, fontWeight: 600, color: colors.body, textDecoration: 'underline', textUnderlineOffset: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Wis alles
        </button>
      )}
    </div>
  )
}
