import { describe, it, expect } from 'vitest'
import {
  heeftConcurrentiedata, marktaandeel, wieWintWelkSegment, presterenWijBeter, concurrentProfielen,
  heeftConcurrentiedataV2, ranglijstPerKantoor, wijVsMarkt, aandeelPerJaar, matrixWieWintWaar, concurrentProfielV2,
  standaardConcurrentieFilter, concurrentieFilterNaarTransactieFilter, concurrentieFilterZonderPeriode,
} from './concurrentie'
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
    bron: null,
    import_id: null,
    adres_sleutel: 'hoofdstraat|1|',
    huisnummer: 1,
    toevoeging: null,
    woningtype_groep: 'rijwoning',
    woningtype_sub: 'Tussenwoning',
    geocode_status: null,
    uitgesloten_reden: null,
    aankopend_kantoor: null,
    verkopend_kantoor_norm: null,
    prijs_m2: null,
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

// ─────────────────────────────────────────────────────────────────────────
// v2 (item 6.3) — werkt op verkopend_kantoor_norm, dedupliceert schrijfwijzen
// ─────────────────────────────────────────────────────────────────────────

describe('heeftConcurrentiedataV2', () => {
  it('false zonder verkopend_kantoor_norm, ook als verkopend_kantoor wél gevuld is', () => {
    expect(heeftConcurrentiedataV2([maakRij({ verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: null })])).toBe(false)
  })

  it('true zodra minstens één concurrent-rij een genormaliseerde naam heeft', () => {
    expect(heeftConcurrentiedataV2([maakRij({ verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b' })])).toBe(true)
  })
})

describe('ranglijstPerKantoor', () => {
  it('dedupliceert schrijfwijzen via verkopend_kantoor_norm en toont de originele naam', () => {
    const rijen = [
      maakRij({ verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b', looptijd_dagen: 20 }),
      maakRij({ verkopend_kantoor: 'MAKELAAR B', verkopend_kantoor_norm: 'makelaar b', looptijd_dagen: 40 }),
      maakRij({ verkopend_kantoor: 'Makelaar C', verkopend_kantoor_norm: 'makelaar c', looptijd_dagen: 10 }),
      maakRij({ eigen_verkoop: true, looptijd_dagen: 5 }),
    ]
    const lijst = ranglijstPerKantoor(rijen)
    const b = lijst.find(r => r.kantoor === 'Makelaar B')
    expect(b?.aantal).toBe(2)
    expect(b?.aandeelPct).toBe(50)
    expect(b?.mediaanLooptijd).toBe(30)
    expect(lijst.find(r => r.kantoor === 'Eigen kantoor')?.aantal).toBe(1)
  })

  it('leeg bij lege dataset, geen crash', () => {
    expect(ranglijstPerKantoor([])).toEqual([])
  })
})

describe('wijVsMarkt', () => {
  it('looptijd/m² als mediaan, t.o.v. vraagprijs als gemiddelde', () => {
    const rijen = [
      maakRij({ eigen_verkoop: true, looptijd_dagen: 10, prijs_m2: 5000, verkoopprijs: 550000, vraagprijs: 500000 }),
      maakRij({ eigen_verkoop: true, looptijd_dagen: 30, prijs_m2: 6000, verkoopprijs: 500000, vraagprijs: 500000 }),
      maakRij({ eigen_verkoop: false, looptijd_dagen: 40, prijs_m2: 4000, verkoopprijs: 480000, vraagprijs: 500000 }),
      maakRij({ eigen_verkoop: false, looptijd_dagen: 60, prijs_m2: 4400, verkoopprijs: 500000, vraagprijs: 500000 }),
    ]
    const r = wijVsMarkt(rijen)
    expect(r.looptijdWij).toBe(20)
    expect(r.looptijdMarkt).toBe(50)
    expect(r.m2Wij).toBe(5500)
    expect(r.m2Markt).toBe(4200)
    expect(r.ratioWij).toBeCloseTo(5, 1) // (10% + 0%) / 2
    expect(r.ratioMarkt).toBeCloseTo(-2, 1) // (-4% + 0%) / 2
    expect(r.nWij).toBe(2)
    expect(r.nMarkt).toBe(2)
  })

  it('null bij een lege deelverzameling, geen crash', () => {
    const r = wijVsMarkt([maakRij({ eigen_verkoop: true, looptijd_dagen: 10 })])
    expect(r.looptijdMarkt).toBeNull()
    expect(r.nMarkt).toBe(0)
  })
})

describe('aandeelPerJaar', () => {
  it('groepeert per jaar en kantoor, totaal blijft het jaartotaal ook bij een subset', () => {
    const rijen = [
      maakRij({ verkoopdatum: '2025-03-01', verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b' }),
      maakRij({ verkoopdatum: '2025-06-01', verkopend_kantoor: 'Makelaar C', verkopend_kantoor_norm: 'makelaar c' }),
      maakRij({ verkoopdatum: '2026-01-01', verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b' }),
    ]
    const alles = aandeelPerJaar(rijen)
    expect(alles.filter(r => r.jaar === 2025).reduce((s, r) => s + r.aantal, 0)).toBe(2)
    const beperkt = aandeelPerJaar(rijen, ['Makelaar B'])
    expect(beperkt.every(r => r.kantoor === 'Makelaar B')).toBe(true)
    const b2025 = beperkt.find(r => r.jaar === 2025)
    expect(b2025?.aantal).toBe(1)
    expect(b2025?.totaal).toBe(2) // jaartotaal blijft 2, ook al toont de output alleen Makelaar B
  })
})

describe('matrixWieWintWaar', () => {
  const rijen = [
    maakRij({ plaats: 'Wassenaar', wijk: 'Centrum', woningtype_groep: 'vrijstaand', verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b' }),
    maakRij({ plaats: 'Wassenaar', wijk: 'Centrum', woningtype_groep: 'vrijstaand', verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b' }),
    maakRij({ plaats: 'Wassenaar', wijk: 'Oostdorp', woningtype_groep: 'vrijstaand', eigen_verkoop: true }),
    maakRij({ plaats: 'Den Haag', wijk: 'Benoordenhout', woningtype_groep: 'appartement', verkopend_kantoor: 'Makelaar C', verkopend_kantoor_norm: 'makelaar c' }),
  ]

  it('op plaatsniveau: top-kantoor + top3 per plaats × typegroep', () => {
    const matrix = matrixWieWintWaar(rijen, false)
    const wassenaarVrijstaand = matrix.find(c => c.rijSleutel === 'Wassenaar' && c.woningtypeGroep === 'vrijstaand')
    expect(wassenaarVrijstaand?.n).toBe(3)
    expect(wassenaarVrijstaand?.top3[0]).toEqual({ kantoor: 'Makelaar B', aantal: 2, aandeelPct: expect.closeTo(66.7, 0) })
  })

  it('op wijkniveau: rijSleutel is "plaats|wijk"', () => {
    const matrix = matrixWieWintWaar(rijen, true)
    const cel = matrix.find(c => c.rijSleutel === 'Wassenaar|Centrum')
    expect(cel?.rijLabel).toBe('Centrum')
    expect(cel?.n).toBe(2)
  })
})

describe('concurrentProfielV2', () => {
  it('n/aandeel/looptijd/verdeling uit de selectie, sterkste plaats + trend uit de regio', () => {
    const selectie = [
      maakRij({ verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b', woningtype_groep: 'appartement', looptijd_dagen: 20 }),
      maakRij({ verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b', woningtype_groep: 'vrijstaand', looptijd_dagen: 40 }),
      maakRij({ eigen_verkoop: true }),
    ]
    const regio = [
      ...selectie,
      maakRij({ plaats: 'Wassenaar', verkopend_kantoor: 'Makelaar B', verkopend_kantoor_norm: 'makelaar b', verkoopdatum: '2025-01-01' }),
      maakRij({ plaats: 'Den Haag', verkopend_kantoor: 'Makelaar C', verkopend_kantoor_norm: 'makelaar c' }),
    ]
    const profiel = concurrentProfielV2(selectie, regio, 'Makelaar B')
    expect(profiel.n).toBe(2)
    expect(profiel.aandeelPct).toBeCloseTo(66.7, 0)
    expect(profiel.mediaanLooptijd).toBe(30)
    expect(profiel.verdeling.find(v => v.woningtypeGroep === 'appartement')?.n).toBe(1)
    expect(profiel.sterkstePlaats).toBe('Wassenaar')
    expect(profiel.trend.reduce((s, t) => s + t.aantal, 0)).toBe(3) // 2 uit selectie + 1 extra regio-rij
  })
})

describe('standaardConcurrentieFilter', () => {
  it('gebruikt het werkgebied als standaard plaatsen, verder alles leeg/uit', () => {
    const f = standaardConcurrentieFilter(['Wassenaar'])
    expect(f.plaatsen).toEqual(['Wassenaar'])
    expect(f.wijken).toEqual([])
    expect(f.periode).toBe(24)
    expect(f.klassen).toEqual([])
    expect(f.verborgen).toEqual([])
    expect(f.sort).toBe('aandeel')
  })
})

describe('concurrentieFilterNaarTransactieFilter', () => {
  it('zet plaatsen/typen/periode om naar het RPC-filter', () => {
    const f = standaardConcurrentieFilter(['Wassenaar'])
    const filter = concurrentieFilterNaarTransactieFilter(f, { datumTot: '2026-09-17' })
    expect(filter.plaatsen).toEqual(['Wassenaar'])
    expect(filter.datum_tot).toBe('2026-09-17')
    expect(filter.datum_van).toBeDefined()
  })

  it('vertaalt meerdere prijsklassen naar het laagste min en het hoogste max', () => {
    const f = { ...standaardConcurrentieFilter([]), klassen: ['k1', 'k3'] }
    const filter = concurrentieFilterNaarTransactieFilter(f, { datumTot: null })
    expect(filter.prijs_min).toBe(0)
    expect(filter.prijs_max).toBe(1_000_000)
  })

  it('laat prijs_max weg voor de hoogste (open) klasse', () => {
    const f = { ...standaardConcurrentieFilter([]), klassen: ['k6'] }
    const filter = concurrentieFilterNaarTransactieFilter(f, { datumTot: null })
    expect(filter.prijs_min).toBe(2_500_000)
    expect(filter.prijs_max).toBeUndefined()
  })

  it('zonder datumTot blijven datumvelden weg (RPC bepaalt dan zelf de span)', () => {
    const f = standaardConcurrentieFilter(['Wassenaar'])
    const filter = concurrentieFilterNaarTransactieFilter(f, { datumTot: null })
    expect(filter.datum_van).toBeUndefined()
    expect(filter.datum_tot).toBeUndefined()
  })
})

describe('concurrentieFilterZonderPeriode', () => {
  it('laat de datumvelden altijd weg, ook met een datumTot elders', () => {
    const f = standaardConcurrentieFilter(['Wassenaar'])
    const filter = concurrentieFilterZonderPeriode(f)
    expect(filter.datum_van).toBeUndefined()
    expect(filter.datum_tot).toBeUndefined()
    expect(filter.plaatsen).toEqual(['Wassenaar'])
  })
})
