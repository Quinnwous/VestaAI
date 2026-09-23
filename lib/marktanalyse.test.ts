import { describe, expect, it } from 'vitest'
import {
  periodeNaarDatums,
  berekenDelta,
  richtingVanDelta,
  prijsklasseFilter,
  PRIJSKLASSEN,
  filterEigenRijen,
  wijKwartaalReeks,
  standaardFilterState,
  filterStateNaarTransactieFilter,
  filterStateNaarEigenFilter,
  segmentBFilter,
  subtypenVoorGroep,
  vorigePeriodeFilter,
  type MarktanalyseFilterV2,
} from './marktanalyse'
import type { TransactieRow } from './supabase'

function rij(overrides: Partial<TransactieRow>): TransactieRow {
  return {
    id: overrides.id ?? 'r1',
    kantoor_id: 'k1',
    adres: 'Teststraat 1',
    postcode: null,
    plaats: 'Wassenaar',
    wijk: 'Centrum',
    buurt: null,
    verkoopprijs: 500_000,
    vraagprijs: 495_000,
    verkoopdatum: '2026-02-15',
    looptijd_dagen: 30,
    woningtype: null,
    woonoppervlak_m2: 120,
    perceel_m2: null,
    inhoud_m3: null,
    bouwjaar: 1990,
    energielabel: 'B',
    kamers: 4,
    garage: false,
    tuin: true,
    buitenruimte: null,
    eigen_verkoop: true,
    verkopend_kantoor: null,
    created_at: '2026-02-16T00:00:00Z',
    bron: null,
    import_id: null,
    adres_sleutel: 'teststraat-1',
    huisnummer: 1,
    toevoeging: null,
    woningtype_groep: 'rijwoning',
    woningtype_sub: 'Tussenwoning',
    geocode_status: null,
    uitgesloten_reden: null,
    aankopend_kantoor: null,
    verkopend_kantoor_norm: null,
    prijs_m2: 4167,
    ...overrides,
  }
}

const LEEG_FILTER: MarktanalyseFilterV2 = { plaatsen: [], wijken: [], typen: [], energielabels: [] }

describe('periodeNaarDatums (item 6.1)', () => {
  it('geeft geen bereik zonder bekende "data t/m"-datum', () => {
    expect(periodeNaarDatums(12, null)).toEqual({})
  })

  it('12 maanden: exact één jaar terug vanaf datumTot', () => {
    expect(periodeNaarDatums(12, '2026-09-12')).toEqual({ datumVan: '2025-09-13', datumTot: '2026-09-12' })
  })

  it('24 en 36 maanden schalen mee', () => {
    expect(periodeNaarDatums(24, '2026-09-12').datumVan).toBe('2024-09-13')
    expect(periodeNaarDatums(36, '2026-09-12').datumVan).toBe('2023-09-13')
  })

  it('periode 0 ("Alles") heeft geen ondergrens', () => {
    expect(periodeNaarDatums(0, '2026-09-12')).toEqual({ datumTot: '2026-09-12' })
  })
})

describe('berekenDelta (t.o.v. vorige periode, docs/roadmap.md § 5 item 6.1 "Klaar als")', () => {
  it('relatieve delta in procent', () => {
    expect(berekenDelta(550_000, 500_000, 'relatief')).toBeCloseTo(10, 5)
    expect(berekenDelta(450_000, 500_000, 'relatief')).toBeCloseTo(-10, 5)
  })

  it('absolute delta (looptijd in dagen, procentpunten)', () => {
    expect(berekenDelta(42, 50, 'absoluut')).toBe(-8)
    expect(berekenDelta(3.2, 1.0, 'absoluut')).toBeCloseTo(2.2, 5)
  })

  it('null bij ontbrekende waarden of delen door nul', () => {
    expect(berekenDelta(null, 500_000)).toBeNull()
    expect(berekenDelta(500_000, null)).toBeNull()
    expect(berekenDelta(100, 0, 'relatief')).toBeNull()
  })
})

describe('richtingVanDelta', () => {
  it('hoger-is-beter (gunstig = 1)', () => {
    expect(richtingVanDelta(5, 1)).toBe('op')
    expect(richtingVanDelta(-5, 1)).toBe('neer')
  })

  it('lager-is-beter (gunstig = -1), zoals looptijd', () => {
    expect(richtingVanDelta(5, -1)).toBe('neer')
    expect(richtingVanDelta(-5, -1)).toBe('op')
  })

  it('neutrale tegel (gunstig = 0) toont nooit een kleur', () => {
    expect(richtingVanDelta(5, 0)).toBeNull()
  })

  it('null/0 randgevallen', () => {
    expect(richtingVanDelta(null, 1)).toBeNull()
    expect(richtingVanDelta(0, 1)).toBe('gelijk')
  })
})

describe('prijsklasseFilter / PRIJSKLASSEN', () => {
  it('zes klassen, aaneensluitend en oplopend', () => {
    expect(PRIJSKLASSEN).toHaveLength(6)
    for (let i = 1; i < PRIJSKLASSEN.length; i++) {
      expect(PRIJSKLASSEN[i].min).toBe(PRIJSKLASSEN[i - 1].max)
    }
  })

  it('vertaalt een klasse naar prijs_min/prijs_max', () => {
    expect(prijsklasseFilter('k2')).toEqual({ prijs_min: 500_000, prijs_max: 750_000 })
  })

  it('de hoogste klasse heeft geen bovengrens', () => {
    expect(prijsklasseFilter('k6')).toEqual({ prijs_min: 2_500_000 })
  })

  it('onbekende sleutel geeft een leeg filter', () => {
    expect(prijsklasseFilter('onbekend')).toEqual({})
  })
})

describe('filterEigenRijen (wij-lijn, dezelfde semantiek als transacties_gefilterd)', () => {
  const rijen = [
    rij({ id: 'a', plaats: 'Wassenaar', wijk: 'Centrum', verkoopprijs: 400_000, perceel_m2: 200 }),
    rij({ id: 'b', plaats: 'Wassenaar', wijk: 'Oostdorp', verkoopprijs: 900_000, perceel_m2: null }),
    rij({ id: 'c', plaats: 'Den Haag', wijk: 'Benoordenhout', verkoopprijs: 600_000, perceel_m2: 150 }),
  ]

  it('zonder filters komt alles door', () => {
    expect(filterEigenRijen(rijen, LEEG_FILTER)).toHaveLength(3)
  })

  it('filtert op plaats', () => {
    const uit = filterEigenRijen(rijen, { ...LEEG_FILTER, plaatsen: ['Wassenaar'] })
    expect(uit.map(r => r.id)).toEqual(['a', 'b'])
  })

  it('filtert op plaats|wijk', () => {
    const uit = filterEigenRijen(rijen, { ...LEEG_FILTER, wijken: ['Wassenaar|Centrum'] })
    expect(uit.map(r => r.id)).toEqual(['a'])
  })

  it('prijsbereik', () => {
    const uit = filterEigenRijen(rijen, { ...LEEG_FILTER, prijsMin: 500_000 })
    expect(uit.map(r => r.id)).toEqual(['b', 'c'])
  })

  it('een actief perceelfilter sluit een rij zonder perceel_m2 uit (consistent met de RPC)', () => {
    const uit = filterEigenRijen(rijen, { ...LEEG_FILTER, perceelMin: 0 })
    expect(uit.map(r => r.id)).toEqual(['a', 'c'])
  })
})

describe('wijKwartaalReeks (mediaan per kwartaal, referentie voor marktanalyse_reeks)', () => {
  it('groepeert per kwartaal en berekent de mediaan', () => {
    const rijen = [
      rij({ id: 'a', verkoopdatum: '2026-01-10', verkoopprijs: 400_000 }),
      rij({ id: 'b', verkoopdatum: '2026-02-10', verkoopprijs: 600_000 }),
      rij({ id: 'c', verkoopdatum: '2026-04-10', verkoopprijs: 500_000 }),
    ]
    const reeks = wijKwartaalReeks(rijen)
    expect(reeks).toEqual([
      expect.objectContaining({ kwartaal: '2026-Q1', n: 2, mediaanPrijs: 500_000 }),
      expect.objectContaining({ kwartaal: '2026-Q2', n: 1, mediaanPrijs: 500_000 }),
    ])
  })

  it('negeert rijen zonder verkoopdatum', () => {
    expect(wijKwartaalReeks([rij({ verkoopdatum: null })])).toEqual([])
  })
})

describe('filterStateNaarTransactieFilter (URL-state → RPC-filter)', () => {
  it('een standaardfilter (alleen werkgebied) geeft alleen plaatsen mee', () => {
    const f = standaardFilterState(['Wassenaar'])
    const filter = filterStateNaarTransactieFilter(f, { datumTot: null })
    expect(filter).toEqual({ plaatsen: ['Wassenaar'] })
  })

  it('periode + datumTot vult datum_van/datum_tot', () => {
    const f = { ...standaardFilterState(['Wassenaar']), periode: 12 as const }
    const filter = filterStateNaarTransactieFilter(f, { datumTot: '2026-09-12' })
    expect(filter.datum_van).toBe('2025-09-13')
    expect(filter.datum_tot).toBe('2026-09-12')
  })

  it('een afwijkende prijsschuiver komt door als prijs_min/prijs_max', () => {
    const f = { ...standaardFilterState([]), prijs: [200_000, 800_000] as [number, number] }
    expect(filterStateNaarTransactieFilter(f, { datumTot: null })).toMatchObject({ prijs_min: 200_000, prijs_max: 800_000 })
  })

  it('een gekozen prijsklasse (crossfilter) intersect met de prijsschuiver', () => {
    const f = { ...standaardFilterState([]), prijs: [600_000, 5_000_000] as [number, number], klasse: 'k2' } // k2 = 500k-750k
    expect(filterStateNaarTransactieFilter(f, { datumTot: null })).toMatchObject({ prijs_min: 600_000, prijs_max: 750_000 })
  })

  it('metKlasse: false laat de klasse weg (voor de verdeling-RPC zelf)', () => {
    const f = { ...standaardFilterState([]), klasse: 'k2' }
    expect(filterStateNaarTransactieFilter(f, { datumTot: null, metKlasse: false })).toEqual({})
  })

  it('kamers = 0 (geen ondergrens) blijft weg uit het filter', () => {
    expect(filterStateNaarTransactieFilter(standaardFilterState([]), { datumTot: null }).kamers_min).toBeUndefined()
  })
})

describe('filterStateNaarEigenFilter', () => {
  it('geeft dezelfde velden als filterStateNaarTransactieFilter, in het MarktanalyseFilterV2-formaat', () => {
    const f = { ...standaardFilterState(['Wassenaar']), tuin: true }
    const eigen = filterStateNaarEigenFilter(f, { datumTot: '2026-09-12' })
    expect(eigen.plaatsen).toEqual(['Wassenaar'])
    expect(eigen.tuin).toBe(true)
    expect(eigen.datumTot).toBe('2026-09-12')
  })
})

describe('segmentBFilter', () => {
  it('null als segment B uit staat', () => {
    expect(segmentBFilter(standaardFilterState([]), { datumTot: null })).toBeNull()
  })

  it('null zonder gekozen plaats, ook als b = true', () => {
    const f = { ...standaardFilterState([]), b: true, bPlaats: '' }
    expect(segmentBFilter(f, { datumTot: null })).toBeNull()
  })

  it('filtert op de segment-B-plaats + typegroep', () => {
    const f = { ...standaardFilterState([]), b: true, bPlaats: 'Den Haag', bGroep: 'appartement' }
    const filter = segmentBFilter(f, { datumTot: null })
    expect(filter?.plaatsen).toEqual(['Den Haag'])
    expect(filter?.typen).toEqual(subtypenVoorGroep('appartement'))
  })

  it('bGroep "alle" filtert niet op type', () => {
    const f = { ...standaardFilterState([]), b: true, bPlaats: 'Den Haag', bGroep: 'alle' }
    expect(segmentBFilter(f, { datumTot: null })?.typen).toBeUndefined()
  })
})

describe('vorigePeriodeFilter (werk-around voor de vorig=0-bug in marktanalyse_samenvatting)', () => {
  it('null zonder datum_van/datum_tot (periode "Alles" — geen vergelijking is dan correct)', () => {
    expect(vorigePeriodeFilter({ plaatsen: ['Wassenaar'] })).toBeNull()
  })

  it('berekent exact dezelfde vorige-periodedatums als de RPC se vorig_span-formule (geverifieerd tegen productiedata 24 sep 2026)', () => {
    const filter = vorigePeriodeFilter({ plaatsen: ['Wassenaar'], datum_van: '2024-09-18', datum_tot: '2026-09-17' })
    expect(filter).toEqual({ plaatsen: ['Wassenaar'], datum_van: '2022-09-19', datum_tot: '2024-09-17' })
  })

  it('behoudt alle overige filtervelden ongewijzigd', () => {
    const filter = vorigePeriodeFilter({ plaatsen: ['Wassenaar'], typen: ['Villa'], prijs_min: 500_000, datum_van: '2025-01-01', datum_tot: '2025-12-31' })
    expect(filter).toMatchObject({ plaatsen: ['Wassenaar'], typen: ['Villa'], prijs_min: 500_000 })
  })

  it('een venster van precies 365 dagen geeft een even lang vorig venster (2024 is een schrikkeljaar: 366 dagen terug, dus 2 jan i.p.v. 1 jan)', () => {
    const filter = vorigePeriodeFilter({ datum_van: '2025-01-01', datum_tot: '2025-12-31' })
    expect(filter).toEqual({ datum_van: '2024-01-02', datum_tot: '2024-12-31' })
  })
})
