/**
 * Kenmerkentabel voor de brochure-pdf (item 8.4, docs/roadmap.md § 5 fase 8).
 * Pure functie, los van React/react-pdf — leest de gedeelde intake
 * (`PropertyInput`, `lib/schemas.ts`) en geeft alleen de rijen terug die
 * ook echt gevuld zijn. Type/m²/kamers/bouwjaar/label zijn verplichte
 * intakevelden en staan er dus altijd; perceel/inhoud/buitenruimte zijn
 * optioneel en verdwijnen stil als de makelaar ze niet heeft ingevuld —
 * nooit een "—" in een klantdocument.
 */
import type { PropertyInput } from './schemas'
import { woningtypeLabel } from './schemas'
import { m2 } from './opmaak'

export interface BrochureKenmerk {
  label: string
  waarde: string
}

const PARKEREN_LABEL: Record<string, string> = {
  garage: 'Garage',
  carport: 'Carport',
  oprit: 'Eigen oprit',
  openbaar: 'Openbaar parkeren',
}

/**
 * Bouwt de "buitenruimte"-rij uit tuin/parkeren/balkon-dakterras. Geeft
 * `null` terug zodra geen van deze velden is ingevuld (of parkeren op
 * "geen" staat) — dan valt de hele rij weg in plaats van een lege waarde.
 */
export function bouwBuitenruimteTekst(ligging: PropertyInput['ligging_buitenruimte']): string | null {
  const delen: string[] = []
  if (ligging?.tuin_m2 != null && ligging.tuin_m2 > 0) delen.push(`Tuin (${m2(ligging.tuin_m2)})`)
  if (ligging?.garage_parkeren && ligging.garage_parkeren !== 'geen') {
    delen.push(PARKEREN_LABEL[ligging.garage_parkeren] ?? ligging.garage_parkeren)
  }
  if (ligging?.balkon_dakterras) delen.push('Balkon/dakterras')
  return delen.length > 0 ? delen.join(', ') : null
}

/**
 * De volledige kenmerkentabel in vaste volgorde (spec item 8.4): type, m²,
 * perceel, inhoud, kamers, bouwjaar, label, buitenruimte.
 */
export function bouwBrochureKenmerken(input: PropertyInput): BrochureKenmerk[] {
  const rijen: BrochureKenmerk[] = [
    { label: 'Type', waarde: woningtypeLabel(input) },
    { label: 'Woonoppervlak', waarde: m2(input.oppervlak_m2) },
  ]
  if (input.perceel_m2 != null) rijen.push({ label: 'Perceeloppervlak', waarde: m2(input.perceel_m2) })
  if (input.inhoud_m3 != null) rijen.push({ label: 'Inhoud', waarde: `${input.inhoud_m3} m³` })
  rijen.push({ label: 'Kamers', waarde: String(input.kamers) })
  rijen.push({ label: 'Bouwjaar', waarde: String(input.bouwjaar) })
  rijen.push({ label: 'Energielabel', waarde: input.energielabel })
  const buitenruimte = bouwBuitenruimteTekst(input.ligging_buitenruimte)
  if (buitenruimte) rijen.push({ label: 'Buitenruimte', waarde: buitenruimte })
  return rijen
}
