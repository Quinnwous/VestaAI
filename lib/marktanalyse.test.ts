import { describe, it, expect } from 'vitest'
import { filterTransacties, naarKwartaalReeks, samenvatting, combineerReeksen } from './marktanalyse'
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
    vraagprijs: 495000,
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
    eigen_verkoop: true,
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

describe('filterTransacties', () => {
  const rijen = [
    maakRij({ woningtype: 'Tussenwoning', wijk: 'Centrum', verkoopdatum: '2026-01-10' }),
    maakRij({ woningtype: 'Villa', wijk: 'Buiten', verkoopdatum: '2026-06-10' }),
  ]

  it('filtert op woningtype', () => {
    expect(filterTransacties(rijen, { woningtype: 'Villa' })).toHaveLength(1)
  })

  it('filtert op wijk', () => {
    expect(filterTransacties(rijen, { wijk: 'Centrum' })).toHaveLength(1)
  })

  it('filtert op periode', () => {
    expect(filterTransacties(rijen, { vanaf: '2026-03-01' })).toHaveLength(1)
    expect(filterTransacties(rijen, { tot: '2026-03-01' })).toHaveLength(1)
  })

  it('zonder filter blijft alles staan', () => {
    expect(filterTransacties(rijen, {})).toHaveLength(2)
  })
})

describe('naarKwartaalReeks', () => {
  it('groepeert per kwartaal en berekent gemiddelden', () => {
    const rijen = [
      maakRij({ verkoopdatum: '2026-01-10', verkoopprijs: 400000, woonoppervlak_m2: 100 }),
      maakRij({ verkoopdatum: '2026-02-20', verkoopprijs: 600000, woonoppervlak_m2: 100 }),
      maakRij({ verkoopdatum: '2026-04-05', verkoopprijs: 500000, woonoppervlak_m2: 50 }),
    ]
    const reeks = naarKwartaalReeks(rijen)
    expect(reeks).toHaveLength(2)
    expect(reeks[0].kwartaal).toBe('2026-K1')
    expect(reeks[0].aantal).toBe(2)
    expect(reeks[0].gemiddeldeVerkoopprijs).toBe(500000)
    expect(reeks[0].gemiddeldeM2Prijs).toBe(5000) // (4000+6000)/2
    expect(reeks[1].kwartaal).toBe('2026-K2')
  })

  it('negeert rijen zonder verkoopdatum in plaats van te crashen', () => {
    const rijen = [maakRij({ verkoopdatum: null })]
    expect(naarKwartaalReeks(rijen)).toHaveLength(0)
  })

  it('geeft null voor gemiddelden zonder data i.p.v. NaN', () => {
    const rijen = [maakRij({ verkoopprijs: null, woonoppervlak_m2: null, looptijd_dagen: null, vraagprijs: null })]
    const reeks = naarKwartaalReeks(rijen)
    expect(reeks[0].gemiddeldeVerkoopprijs).toBeNull()
    expect(reeks[0].gemiddeldeM2Prijs).toBeNull()
    expect(reeks[0].gemiddeldeLooptijd).toBeNull()
  })
})

describe('combineerReeksen', () => {
  it('lijnt twee reeksen uit op de vereniging van kwartalen', () => {
    const a = naarKwartaalReeks([maakRij({ verkoopdatum: '2026-01-10', verkoopprijs: 400000 })])
    const b = naarKwartaalReeks([maakRij({ verkoopdatum: '2026-04-10', verkoopprijs: 600000 })])
    const combi = combineerReeksen(a, b, 'gemiddeldeVerkoopprijs')
    expect(combi).toEqual([
      { kwartaal: '2026-K1', a: 400000, b: null },
      { kwartaal: '2026-K2', a: null, b: 600000 },
    ])
  })
})

describe('samenvatting', () => {
  it('telt en middelt over de hele set', () => {
    const rijen = [
      maakRij({ verkoopprijs: 400000, woonoppervlak_m2: 100, looptijd_dagen: 20 }),
      maakRij({ verkoopprijs: 600000, woonoppervlak_m2: 100, looptijd_dagen: 40 }),
    ]
    const s = samenvatting(rijen)
    expect(s.aantal).toBe(2)
    expect(s.gemiddeldeVerkoopprijs).toBe(500000)
    expect(s.gemiddeldeLooptijd).toBe(30)
  })

  it('werkt op een lege set zonder te crashen', () => {
    const s = samenvatting([])
    expect(s.aantal).toBe(0)
    expect(s.gemiddeldeVerkoopprijs).toBeNull()
  })
})
