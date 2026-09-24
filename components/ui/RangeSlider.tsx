'use client'

/**
 * RangeSlider — `Slider` (Radix, tweezijdig) met waardepillen erboven en
 * ticks eronder, voor filterschuivers (prijs/oppervlak/bouwjaar/perceel),
 * item 6.1. Poort van `docs/ontwerp/kit.js` `rangeSlider()`. Gebruik:
 *   <RangeSlider min={0} max={5_000_000} stap={25_000} waarde={[0, 5_000_000]}
 *     fmt={(v, kant) => kant === 'tot' && v >= 5_000_000 ? 'geen max' : euroKort(v)}
 *     ticks={['€ 0', '1 mln', '2 mln', '3 mln', '4 mln', '5 mln+']}
 *     onChange={setWaarde} />
 */

import { Slider } from './Slider'
import { colors, radius } from './tokens'

export function RangeSlider({
  min,
  max,
  stap = 1,
  waarde,
  fmt,
  ticks = [],
  onChange,
  onEind,
}: {
  min: number
  max: number
  stap?: number
  waarde: [number, number]
  fmt: (v: number, kant: 'van' | 'tot') => string
  ticks?: string[]
  onChange: (waarde: [number, number]) => void
  onEind?: (waarde: [number, number]) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ background: 'var(--merk-zacht)', color: 'var(--merk-diep)', fontWeight: 700, fontSize: 12.5, padding: '2px 9px', borderRadius: radius.pill, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(waarde[0], 'van')}
        </span>
        <span style={{ background: 'var(--merk-zacht)', color: 'var(--merk-diep)', fontWeight: 700, fontSize: 12.5, padding: '2px 9px', borderRadius: radius.pill, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(waarde[1], 'tot')}
        </span>
      </div>
      <Slider waarde={waarde} min={min} max={max} stap={stap} onChange={onChange} onEind={onEind} />
      {ticks.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: colors.muted }}>
          {ticks.map((t, i) => <span key={i}>{t}</span>)}
        </div>
      )}
    </div>
  )
}
