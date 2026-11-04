'use client'

import { bouwBranding, brandingCssVars, type LettertypeKeuze, type VormKeuze } from '@/lib/branding'
import { HuisIllustratie } from '@/components/ui/HuisIllustratie'
import { SerifTitle } from '@/components/ui/PageHeader'

/**
 * Live voorbeeld van een huisstijl in het admin-formulier: een stukje van de
 * kantooromgeving (hero-tegel, knop, pil, kop met accent, 3D-woning) met
 * precies de `--merk*`-variabelen die lib/branding.ts voor deze keuzes
 * uitrekent. Zo zie je contrast, vorm en lettertype vóór het opslaan.
 */
export function HuisstijlVoorbeeld({ naam, primair, accent, lettertype, vorm }: {
  naam: string
  primair: string
  accent: string
  lettertype: LettertypeKeuze
  vorm: VormKeuze
}) {
  const branding = bouwBranding({
    name: naam,
    logo_url: null,
    huisstijl_json: { primaire_kleur: primair, accent_kleur: accent, lettertype, vorm },
  })
  return (
    <div
      aria-label="Voorbeeld van de huisstijl"
      style={{
        ...brandingCssVars(branding),
        fontFamily: 'var(--merk-font-body)',
        background: '#FAFBFB',
        border: '1px solid #E6E9EC',
        borderRadius: 16,
        padding: 18,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--merk-accent)' }}>Voorbeeld</p>
        <SerifTitle as="h3" size={24} accent="woningen">Jouw</SerifTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 'var(--merk-radius-md)', background: 'var(--merk)', color: 'var(--merk-op)', fontSize: 13, fontWeight: 700 }}>Woning toevoegen</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 11px', borderRadius: 'var(--merk-radius-pill)', background: 'var(--merk-zacht)', color: 'var(--merk-tekst)', fontSize: 12, fontWeight: 700, boxShadow: '0 0 0 1px var(--merk-rand) inset' }}>In verkoop</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--merk-tekst)' }}>Alles bekijken →</span>
        </div>
        <div style={{ borderRadius: 'var(--merk-radius-card-lg)', padding: '14px 16px', background: 'linear-gradient(135deg, var(--merk) 0%, var(--merk-diep) 100%)', color: 'var(--merk-op)', maxWidth: 240 }}>
          <div style={{ fontSize: 12, fontWeight: 650, opacity: 0.85 }}>Verkocht laatste 12 maanden</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>42</div>
        </div>
      </div>
      <HuisIllustratie breedte={130} />
    </div>
  )
}
