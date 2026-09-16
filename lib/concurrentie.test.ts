import { describe, it, expect } from 'vitest'
import { heeftConcurrentiedata, marktaandeel, wieWintWelkSegment, presterenWijBeter, concurrentProfielen } from './concurrentie'
import type { TransactieRow } from './supabase'

function maakRij(overrides: Partial<TransactieRow>): TransactieRow {
  return {
    id: crypto.randomUUID(),
    kantoor_id: 'k1',
    adres: 'Hoofdstraat 1',
    postcode: null,
    plaats: null,
    wijk: null,
    buurt: null,
    verkoopprijs: 500000,
    vraagprijs: 500000,
    verkoopdatum: '2026-02-15',
    looptijd_dagen: 30,
    woningtype: 'Tussenwoning',
    woonoppervlak_m2: 100,
    perceel_m2: null,
    inhoud_m3: null,
    bouwjaar: null,
    energielabel: null,
    kamers: null,
    garage: null,
    tuin: null,
    buitenruimte: null,
    eigen_verkoop: false,
    verkopend_kantoor: null,
    created_at: '2026-02-16T00:00:00Z',
    ...overrides,
  }
}

describe('heeftConcurrentiedata', () => {
  it('false als geen enkele rij een verkopend_kantoor heeft', () => {
    expect(heeftConcurrentiedata([maakRij({}), maakRij({ eigen_verkoop: true })])).toBe(false)
  })

  it('true zodra minstens één concurrent-rij een naam heeft', () => {
    expect(heeftConcurrentiedata([maakRij({ verkopend_kantoor: 'Makelaar B' })])).toBe(true)
  })
})

describe('marktaandeel', () => {
  it('berekent aandeel per kantoor, eigen verkoop apart gelabeld', () => {
    const rijen = [
      maakRij({ eigen_verkoop: true }),
      maakRij({ verkopend_kantoor: 'Makelaar B' }),
      maakRij({ verkopend_kantoor: 'Makelaar B' }),
      maakRij({ verkopend_kantoor: 'Makelaar C' }),
    ]
    const result = marktaandeel(rijen)
    expect(result[0]).toEqual({ kantoor: 'Makelaar B', aantal: 2, aandeelPct: 50 })
    expect(result.find(r => r.kantoor === 'Eigen kantoor')).toEqual({ kantoor: 'Eigen kantoor', aantal: 1, aandeelPct: 25 })
  })

  it('leeg bij lege dataset, geen crash', () => {
    expect(marktaandeel([])).toEqual([])
  })
})

describe('wieWintWelkSegment', () => {
  it('vindt per woningtype de winnaar', () => {
    const rijen = [
      maakRij({ woningtype: 'Villa', verkopend_kantoor: 'Makelaar B' }),
      maakRij({ woningtype: 'Villa', verkopend_kantoor: 'Makelaar B' }),
      maakRij({ woningtype: 'Villa', eigen_verkoop: true }),
      maakRij({ woningtype: 'Appartement', eigen_verkoop: true }),
    ]
    const result = wieWintWelkSegment(rijen)
    const villa = result.find(r => r.segment === 'Villa')
    expect(villa?.winnaar).toBe('Makelaar B')
    expect(villa?.aantal).toBe(2)
  })
})

describe('presterenWijBeter', () => {
  it('vergelijkt eigen doorlooptijd met de rest', () => {
    const rijen = [
      maakRij({ eigen_verkoop: true, looptijd_dagen: 10 }),
      maakRij({ eigen_verkoop: true, looptijd_dagen: 20 }),
      maakRij({ eigen_verkoop: false, looptijd_dagen: 40 }),
      maakRij({ eigen_verkoop: false, looptijd_dagen: 60 }),
    ]
    const result = presterenWijBeter(rijen)
    expect(result.eigenGemLooptijd).toBe(15)
    expect(result.regioGemLooptijd).toBe(50)
  })
})

describe('concurrentProfielen', () => {
  it('geeft per kantoor aantal, gemiddelde prijs en topsegment', () => {
    const rijen = [
      maakRij({ verkopend_kantoor: 'Makelaar B', woningtype: 'Villa', verkoopprijs: 800000 }),
      maakRij({ verkopend_kantoor: 'Makelaar B', woningtype: 'Villa', verkoopprijs: 900000 }),
      maakRij({ verkopend_kantoor: 'Makelaar B', woningtype: 'Appartement', verkoopprijs: 300000 }),
    ]
    const [profiel] = concurrentProfielen(rijen)
    expect(profiel.kantoor).toBe('Makelaar B')
    expect(profiel.aantal).toBe(3)
    expect(profiel.gemiddeldePrijs).toBeCloseTo((800000 + 900000 + 300000) / 3, 0)
    expect(profiel.topSegment).toBe('Villa')
  })
})
