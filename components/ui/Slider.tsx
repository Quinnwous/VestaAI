'use client'

/**
 * Slider — bereikschuiver (prijs, oppervlak) op Radix Slider, altijd tweezijdig.
 * Gebruik: <Slider waarde={[min, max]} min={0} max={1e6} stap={10000} onChange={…} />
 * Volledig toetsenbordbedienbaar (pijltjes/Home/End) met merkkleurige focusring.
 * `onChange` vuurt tijdens het slepen, `onEind` pas bij loslaten — hang een
 * query aan `onEind`, niet aan `onChange`.
 */

import * as RadixSlider from '@radix-ui/react-slider'
import { colors, radius } from './tokens'

export function Slider({
  waarde,
  min,
  max,
  stap = 1,
  onChange,
  onEind,
  labels,
}: {
  waarde: [number, number]
  min: number
  max: number
  stap?: number
  onChange: (waarde: [number, number]) => void
  onEind?: (waarde: [number, number]) => void
  labels?: [string, string]
}) {
  return (
    <div>
      <RadixSlider.Root
        value={waarde}
        min={min}
        max={max}
        step={stap}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => onChange([v[0], v[1]])}
        onValueCommit={(v) => onEind?.([v[0], v[1]])}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', height: 22, touchAction: 'none', userSelect: 'none' }}
      >
        <RadixSlider.Track style={{ position: 'relative', flexGrow: 1, height: 4, background: colors.surfaceAlt, borderRadius: radius.pill, border: `1px solid ${colors.border}` }}>
          <RadixSlider.Range style={{ position: 'absolute', height: '100%', background: 'var(--merk)', borderRadius: radius.pill }} />
        </RadixSlider.Track>
        {[0, 1].map((i) => (
          <RadixSlider.Thumb
            key={i}
            aria-label={i === 0 ? 'Ondergrens' : 'Bovengrens'}
            className="vui-sliderknop"
            style={{
              display: 'block', width: 18, height: 18, borderRadius: '50%',
              background: colors.surface, border: '1.5px solid var(--merk)',
              boxShadow: '0 1px 4px rgba(20,24,27,.18)', cursor: 'grab', outline: 'none',
            }}
          />
        ))}
      </RadixSlider.Root>
      {labels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: colors.muted, fontVariantNumeric: 'tabular-nums' }}>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  )
}
