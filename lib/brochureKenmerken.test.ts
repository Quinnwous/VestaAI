import { describe, it, expect } from 'vitest'
import { bouwBrochureKenmerken, bouwBuitenruimteTekst } from './brochureKenmerken'
import type { PropertyInput } from './schemas'

const BASIS: PropertyInput = {
  adres: 'Kerkstraat 1, Wassenaar',
  woningtype_groep: 'rijwoning',
  kamers: 5,
  oppervlak_m2: 120,
  bouwjaar: 1965,
  energielabel: 'C',
} as unknown as PropertyInput

describe('bouwBrochureKenmerken', () => {
  it('geeft alleen de verplichte rijen terug zonder optionele velden', () => {
    const rijen = bouwBrochureKenmerken(BASIS)
    const labels = rijen.map(r => r.label)
    expect(labels).toEqual(['Type', 'Woonoppervlak', 'Kamers', 'Bouwjaar', 'Energielabel'])
    expect(rijen.find(r => r.label === 'Woonoppervlak')?.waarde).toBe('120 m²')
    expect(rijen.find(r => r.label === 'Energielabel')?.waarde).toBe('C')
  })

  it('gebruikt het subtype als woningtype_sub is ingevuld', () => {
    const rijen = bouwBrochureKenmerken({ ...BASIS, woningtype_sub: 'Villa' })
    expect(rijen.find(r => r.label === 'Type')?.waarde).toBe('Villa')
  })

  it('voegt perceel en inhoud toe zodra ze gevuld zijn, in de vaste volgorde', () => {
    const rijen = bouwBrochureKenmerken({ ...BASIS, perceel_m2: 250, inhoud_m3: 480 })
    const labels = rijen.map(r => r.label)
    expect(labels).toEqual(['Type', 'Woonoppervlak', 'Perceeloppervlak', 'Inhoud', 'Kamers', 'Bouwjaar', 'Energielabel'])
    expect(rijen.find(r => r.label === 'Perceeloppervlak')?.waarde).toBe('250 m²')
    expect(rijen.find(r => r.label === 'Inhoud')?.waarde).toBe('480 m³')
  })

  it('een perceel_m2 van 0 telt als gevuld en wordt getoond', () => {
    const rijen = bouwBrochureKenmerken({ ...BASIS, perceel_m2: 0 })
    expect(rijen.find(r => r.label === 'Perceeloppervlak')?.waarde).toBe('0 m²')
  })

  it('voegt een buitenruimte-rij toe met tuin, parkeren en balkon gecombineerd', () => {
    const rijen = bouwBrochureKenmerken({
      ...BASIS,
      ligging_buitenruimte: { tuin_m2: 85, garage_parkeren: 'garage', balkon_dakterras: true },
    })
    expect(rijen.find(r => r.label === 'Buitenruimte')?.waarde).toBe('Tuin (85 m²), Garage, Balkon/dakterras')
  })

  it('laat de buitenruimte-rij weg zonder tuin/parkeren/balkon', () => {
    const rijen = bouwBrochureKenmerken({ ...BASIS, ligging_buitenruimte: { garage_parkeren: 'geen' } })
    expect(rijen.find(r => r.label === 'Buitenruimte')).toBeUndefined()
  })

  it('laat een tuin van 0 m² weg (geen tuin)', () => {
    const tekst = bouwBuitenruimteTekst({ tuin_m2: 0 })
    expect(tekst).toBeNull()
  })

  it('bouwBuitenruimteTekst geeft null zonder invoer', () => {
    expect(bouwBuitenruimteTekst(undefined)).toBeNull()
  })
})
