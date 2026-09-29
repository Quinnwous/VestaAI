'use client'

/**
 * Slider — schuiver op Radix Slider, standaard tweezijdig (bereik: prijs,
 * oppervlak) maar ook bruikbaar als enkelvoudige schuiver (bv. een straal in
 * meters, item 7.3) door `waarde`/`onChange`/`onEind` een los getal te geven
 * i.p.v. een tuple.
 * Gebruik (bereik): <Slider waarde={[min, max]} min={0} max={1e6} stap={10000} onChange={…} />
 * Gebruik (enkel):  <Slider waarde={500} min={100} max={1000} stap={50} ariaLabel="Straal" onChange={…} />
 * Volledig toetsenbordbedienbaar (pijltjes/Home/End) met merkkleurige focusring.
 * `onChange` vuurt tijdens het slepen, `onEind` pas bij loslaten — hang een
 * query aan `onEind`, niet aan `onChange`.
 */

import * as RadixSlider from '@radix-ui/react-slider'
import type { JSX } from 'react'
import { colors, radius } from './tokens'

type SliderBereikProps = {
  waarde: [number, number]
  min: number
  max: number
  stap?: number
  onChange: (waarde: [number, number]) => void
  onEind?: (waarde: [number, number]) => void
  labels?: [string, string]
  ariaLabel?: never
}

type SliderEnkelProps = {
  waarde: number
  min: number
  max: number
  stap?: number
  onChange: (waarde: number) => void
  onEind?: (waarde: number) => void
  labels?: never
  /** Verplicht bij een enkelvoudige schuiver — de twee-thumb-variant gebruikt "Ondergrens"/"Bovengrens". */
  ariaLabel: string
}

export function Slider(props: SliderBereikProps): JSX.Element
export function Slider(props: SliderEnkelProps): JSX.Element
export function Slider(props: SliderBereikProps | SliderEnkelProps) {
  const { min, max, stap = 1 } = props
  const isBereik = Array.isArray(props.waarde)
  const waardeArr = isBereik ? (props.waarde as [number, number]) : [props.waarde as number]

  return (
    <div>
      <RadixSlider.Root
        value={waardeArr}
        min={min}
        max={max}
        step={stap}
        minStepsBetweenThumbs={isBereik ? 1 : undefined}
        onValueChange={(v) => (isBereik ? (props as SliderBereikProps).onChange([v[0], v[1]]) : (props as SliderEnkelProps).onChange(v[0]))}
        onValueCommit={(v) => (isBereik ? (props as SliderBereikProps).onEind?.([v[0], v[1]]) : (props as SliderEnkelProps).onEind?.(v[0]))}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', height: 22, touchAction: 'none', userSelect: 'none' }}
      >
        <RadixSlider.Track style={{ position: 'relative', flexGrow: 1, height: 4, background: colors.surfaceAlt, borderRadius: radius.pill, border: `1px solid ${colors.border}` }}>
          <RadixSlider.Range style={{ position: 'absolute', height: '100%', background: 'var(--merk)', borderRadius: radius.pill }} />
        </RadixSlider.Track>
        {waardeArr.map((_, i) => (
          <RadixSlider.Thumb
            key={i}
            aria-label={isBereik ? (i === 0 ? 'Ondergrens' : 'Bovengrens') : (props as SliderEnkelProps).ariaLabel}
            className="vui-sliderknop"
            style={{
              display: 'block', width: 18, height: 18, borderRadius: '50%',
              background: colors.surface, border: '1.5px solid var(--merk)',
              boxShadow: '0 1px 4px rgba(20,24,27,.18)', cursor: 'grab', outline: 'none',
            }}
          />
        ))}
      </RadixSlider.Root>
      {isBereik && props.labels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: colors.muted, fontVariantNumeric: 'tabular-nums' }}>
          <span>{props.labels[0]}</span>
          <span>{props.labels[1]}</span>
        </div>
      )}
    </div>
  )
}
