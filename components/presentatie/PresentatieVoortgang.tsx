'use client'

import type { CSSProperties } from 'react'
import { PRESENTATIE_STAP_LABEL, type PresentatieStapId } from '@/lib/presentatie'
import { radius } from '@/components/ui/tokens'

/**
 * Onderbalk van de presentatiemodus: klikbare stippen-voortgang + vorige/
 * volgende-knoppen (ook bruikbaar met een muis/touch, naast de toetsenbord-
 * navigatie in `WaardePresentatie.tsx`). De actieve stip is breder in de
 * merkkleur — zelfde interactiepatroon als een carousel, bewust géén
 * paginanummers ("stap 3 van 6") omdat een overgeslagen stap (geen WOZ)
 * anders een vreemde telling zou geven.
 */
export function PresentatieVoortgang({
  stappen,
  index,
  onGaNaar,
  onVorige,
  onVolgende,
}: {
  stappen: PresentatieStapId[]
  index: number
  onGaNaar: (i: number) => void
  onVorige: () => void
  onVolgende: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '4px 24px 28px', flexShrink: 0 }}>
      <button type="button" onClick={onVorige} disabled={index === 0} aria-label="Vorige" style={navKnop(index === 0)}>
        <PijlIcon links />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {stappen.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => onGaNaar(i)}
            aria-label={PRESENTATIE_STAP_LABEL[s]}
            aria-current={i === index ? 'step' : undefined}
            style={{
              width: i === index ? 28 : 9,
              height: 9,
              borderRadius: radius.pill,
              background: i === index ? 'var(--merk)' : 'rgba(20,24,27,.2)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'all 220ms cubic-bezier(.2,.8,.2,1)',
            }}
          />
        ))}
      </div>
      <button type="button" onClick={onVolgende} disabled={index === stappen.length - 1} aria-label="Volgende" style={navKnop(index === stappen.length - 1)}>
        <PijlIcon />
      </button>
    </div>
  )
}

function navKnop(disabled: boolean): CSSProperties {
  return {
    width: 46,
    height: 46,
    borderRadius: '50%',
    border: 'none',
    display: 'grid',
    placeItems: 'center',
    background: disabled ? 'rgba(20,24,27,.05)' : '#fff',
    color: disabled ? 'rgba(20,24,27,.22)' : '#14181B',
    cursor: disabled ? 'default' : 'pointer',
    boxShadow: disabled ? 'none' : '0 6px 18px -6px rgba(20,24,27,.3)',
    transition: 'transform 150ms',
    flexShrink: 0,
  }
}

function PijlIcon({ links = false }: { links?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: links ? 'scaleX(-1)' : undefined }}>
      <path d="M7 4l6 6-6 6" />
    </svg>
  )
}
