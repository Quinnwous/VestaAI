import { describe, it, expect } from 'vitest'
import { beoordeelTransactie } from './transactieKwaliteit'

const VANDAAG = new Date('2026-09-28T00:00:00Z')

const GELDIG = {
  adres_sleutel: '2242ab|12|',
  verkoopprijs: 450_000,
  woonoppervlak_m2: 120,
  bouwjaar: 1990,
  verkoopdatum: '2026-05-01',
}

describe('beoordeelTransactie', () => {
  it('keurt een normale rij goed (geen reden)', () => {
    expect(beoordeelTransactie(GELDIG, { vandaag: VANDAAG })).toEqual({ uitgesloten_reden: null })
  })

  it('sluit uit zonder adres_sleutel', () => {
    expect(beoordeelTransactie({ ...GELDIG, adres_sleutel: null }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'adres_sleutel_ontbreekt',
    })
  })

  it('sluit uit zonder verkoopprijs', () => {
    expect(beoordeelTransactie({ ...GELDIG, verkoopprijs: null }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'verkoopprijs_ontbreekt',
    })
  })

  it('sluit uit zonder verkoopdatum', () => {
    expect(beoordeelTransactie({ ...GELDIG, verkoopdatum: null }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'verkoopdatum_ontbreekt',
    })
  })

  it('sluit uit bij een te lage prijs', () => {
    expect(beoordeelTransactie({ ...GELDIG, verkoopprijs: 10_000 }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'prijs_onwaarschijnlijk',
    })
  })

  it('sluit uit bij een te hoge prijs', () => {
    expect(beoordeelTransactie({ ...GELDIG, verkoopprijs: 15_000_000 }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'prijs_onwaarschijnlijk',
    })
  })

  it('accepteert de grenswaarden zelf (50.000 en 10.000.000)', () => {
    expect(beoordeelTransactie({ ...GELDIG, verkoopprijs: 50_000, woonoppervlak_m2: 100 }, { vandaag: VANDAAG }).uitgesloten_reden).toBeNull()
    expect(
      beoordeelTransactie({ ...GELDIG, verkoopprijs: 10_000_000, woonoppervlak_m2: 900 }, { vandaag: VANDAAG }).uitgesloten_reden,
    ).toBeNull()
  })

  it('sluit uit bij een onwaarschijnlijk klein of groot oppervlak', () => {
    expect(beoordeelTransactie({ ...GELDIG, woonoppervlak_m2: 10 }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'oppervlak_onwaarschijnlijk',
    })
    expect(beoordeelTransactie({ ...GELDIG, woonoppervlak_m2: 5_000 }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'oppervlak_onwaarschijnlijk',
    })
  })

  it('laat een ontbrekend oppervlak door (optioneel veld, geen reden om uit te sluiten)', () => {
    expect(beoordeelTransactie({ ...GELDIG, woonoppervlak_m2: null }, { vandaag: VANDAAG }).uitgesloten_reden).toBeNull()
  })

  it('sluit uit bij een onwaarschijnlijke prijs per m²', () => {
    // 450.000 / 1000 m² = 450 €/m² — onder de 500-ondergrens, maar oppervlak zelf (1000) net binnen bereik.
    expect(beoordeelTransactie({ ...GELDIG, woonoppervlak_m2: 1000 }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'prijs_per_m2_onwaarschijnlijk',
    })
  })

  it('sluit uit bij een onwaarschijnlijk bouwjaar', () => {
    expect(beoordeelTransactie({ ...GELDIG, bouwjaar: 1500 }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'bouwjaar_onwaarschijnlijk',
    })
    expect(beoordeelTransactie({ ...GELDIG, bouwjaar: 2030 }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'bouwjaar_onwaarschijnlijk',
    })
  })

  it('accepteert bouwjaar t/m huidig jaar + 1 (nieuwbouw in aanbouw)', () => {
    expect(beoordeelTransactie({ ...GELDIG, bouwjaar: 2027 }, { vandaag: VANDAAG }).uitgesloten_reden).toBeNull()
  })

  it('laat een ontbrekend bouwjaar door', () => {
    expect(beoordeelTransactie({ ...GELDIG, bouwjaar: null }, { vandaag: VANDAAG }).uitgesloten_reden).toBeNull()
  })

  it('sluit uit bij een verkoopdatum vóór 2000', () => {
    expect(beoordeelTransactie({ ...GELDIG, verkoopdatum: '1999-12-31' }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'verkoopdatum_onwaarschijnlijk',
    })
  })

  it('sluit uit bij een verkoopdatum in de toekomst', () => {
    expect(beoordeelTransactie({ ...GELDIG, verkoopdatum: '2026-12-01' }, { vandaag: VANDAAG })).toEqual({
      uitgesloten_reden: 'verkoopdatum_onwaarschijnlijk',
    })
  })

  it('accepteert vandaag zelf als verkoopdatum', () => {
    expect(beoordeelTransactie({ ...GELDIG, verkoopdatum: '2026-09-28' }, { vandaag: VANDAAG }).uitgesloten_reden).toBeNull()
  })
})
