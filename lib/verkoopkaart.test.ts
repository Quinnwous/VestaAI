import { describe, expect, it } from 'vitest'
import type { TransactieRow } from './supabase'
import { kwartaalNummer } from './prijsindex'
import {
  tijdlijnFilterDatums,
  kwartaalBereikUitRijen,
  standaardVerkoopkaartFilter,
  verkoopkaartFilterNaarEigenFilter,
  filterVerkoopkaartRijen,
  berekenVerkoopkaartKerncijfers,
  verkoopkaartSparklineReeks,
  sorteerVerkopen,
  PRIJS_BEREIK,
} from './verkoopkaart'

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
    verkoopdatum: '2024-02-15',
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
    created_at: '2024-02-16T00:00:00Z',
    bron: null,
    import_id: null,
    adres_sleutel: 'sleutel-1',
    huisnummer: 1,
    toevoeging: null,
    woningtype_groep: 'rijwoning',
    woningtype_sub: 'Tussenwoning',
    geocode_status: null,
    uitgesloten_reden: null,
    aankopend_kantoor: null,
    verkopend_kantoor_norm: null,
    prijs_m2: 4_167,
    ...overrides,
  }
}

describe('tijdlijnFilterDatums', () => {
  it('zet een kwartaalnummer-bereik om naar eerste/laatste dag (inclusief)', () => {
    // 2024-Q1 t/m 2024-Q2
    const van = 2024 * 4 + 0 // Q1
    const tot = 2024 * 4 + 1 // Q2
    expect(tijdlijnFilterDatums(van, tot)).toEqual({ datumVan: '2024-01-01', datumTot: '2024-06-30' })
  })

  it('behandelt Q4 correct (jaarovergang)', () => {
    const q4 = 2024 * 4 + 3
    expect(tijdlijnFilterDatums(q4, q4)).toEqual({ datumVan: '2024-10-01', datumTot: '2024-12-31' })
  })
})

describe('kwartaalBereikUitRijen', () => {
  it('geeft min/max kwartaal van de dataset', () => {
    const rijen = [rij({ verkoopdatum: '2023-05-01' }), rij({ verkoopdatum: '2024-11-20' }), rij({ verkoopdatum: '2024-01-05' })]
    const bereik = kwartaalBereikUitRijen(rijen)
    // 2023-Q2 .. 2024-Q4
    expect(bereik.van).toBeLessThan(bereik.tot)
    expect(bereik.tot - bereik.van).toBe(6) // 2023-Q2(1) -> 2024-Q4(15): 14 kwartalen verschil? controleer via datum
  })

  it('valt terug op de referentiedatum bij een lege set, nooit op de systeemklok', () => {
    const bereik = kwartaalBereikUitRijen([], '2025-07-01')
    expect(bereik.van).toBe(bereik.tot)
    const nogEensZelfdeInvoer = kwartaalBereikUitRijen([], '2025-07-01')
    expect(nogEensZelfdeInvoer).toEqual(bereik)
  })

  it('valt terug op een vaste datum zonder referentiedatum (deterministisch)', () => {
    const a = kwartaalBereikUitRijen([])
    const b = kwartaalBereikUitRijen([])
    expect(a).toEqual(b)
  })
})

describe('standaardVerkoopkaartFilter / verkoopkaartFilterNaarEigenFilter', () => {
  // Realistische kwartaalnummers (jaar × 4 + kwartaal − 1, lib/prijsindex.ts)
  // i.p.v. kleine testgetallen: `kwartaalUitNummer()` padt het jaar niet met
  // nullen, dus een klein getal als 10 zou een ongeldig kwartaal ("2-Q3")
  // opleveren — geen bug, gewoon nooit een realistisch kwartaalnummer.
  const q1_2024 = kwartaalNummer('2024-Q1')
  const q4_2024 = kwartaalNummer('2024-Q4')

  it('laat bereiken op hun standaardwaarde weg uit het eigen-filter', () => {
    const f = standaardVerkoopkaartFilter(q1_2024, q4_2024)
    const eigen = verkoopkaartFilterNaarEigenFilter(f)
    expect(eigen.prijsMin).toBeUndefined()
    expect(eigen.prijsMax).toBeUndefined()
    expect(eigen.oppMin).toBeUndefined()
    expect(eigen.tuin).toBeUndefined()
    expect(eigen.garage).toBeUndefined()
  })

  it('geeft een actief prijsfilter door', () => {
    const f = { ...standaardVerkoopkaartFilter(q1_2024, q1_2024), prijs: [100_000, 400_000] as [number, number] }
    const eigen = verkoopkaartFilterNaarEigenFilter(f)
    expect(eigen.prijsMin).toBe(100_000)
    expect(eigen.prijsMax).toBe(400_000)
  })

  it('PRIJS_BEREIK is de gedeelde constante uit lib/marktanalyse.ts', () => {
    expect(standaardVerkoopkaartFilter(q1_2024, q1_2024).prijs).toEqual(PRIJS_BEREIK)
  })
})

describe('filterVerkoopkaartRijen', () => {
  it('filtert op typen en periode samen', () => {
    const rijen = [
      rij({ id: 'a', woningtype_sub: 'Tussenwoning', verkoopdatum: '2024-02-01' }),
      rij({ id: 'b', woningtype_sub: 'Vrijstaande woning', verkoopdatum: '2024-02-01' }),
      rij({ id: 'c', woningtype_sub: 'Tussenwoning', verkoopdatum: '2023-01-01' }),
    ]
    const f = { ...standaardVerkoopkaartFilter(2024 * 4, 2024 * 4 + 3), typen: ['Tussenwoning'] }
    const resultaat = filterVerkoopkaartRijen(rijen, f)
    expect(resultaat.map(r => r.id)).toEqual(['a'])
  })
})

describe('berekenVerkoopkaartKerncijfers', () => {
  it('berekent n, mediaan prijs/m², gem. looptijd en % boven vraagprijs', () => {
    const rijen = [
      rij({ id: 'a', verkoopprijs: 400_000, vraagprijs: 390_000, prijs_m2: 4_000, looptijd_dagen: 20 }), // boven
      rij({ id: 'b', verkoopprijs: 500_000, vraagprijs: 520_000, prijs_m2: 5_000, looptijd_dagen: 40 }), // onder
      rij({ id: 'c', verkoopprijs: 600_000, vraagprijs: 590_000, prijs_m2: 6_000, looptijd_dagen: 60 }), // boven
    ]
    const k = berekenVerkoopkaartKerncijfers(rijen)
    expect(k.n).toBe(3)
    expect(k.mediaanPrijs).toBe(500_000)
    expect(k.mediaanM2).toBe(5_000)
    expect(k.gemLooptijd).toBe(40)
    expect(k.pctBovenVraagprijs).toBeCloseTo((2 / 3) * 100, 1)
  })

  it('geeft null-cijfers bij een lege set, nooit 0 of NaN', () => {
    const k = berekenVerkoopkaartKerncijfers([])
    expect(k).toEqual({ n: 0, mediaanPrijs: null, mediaanM2: null, gemLooptijd: null, pctBovenVraagprijs: null })
  })

  it('telt een rij zonder vraagprijs niet mee in het percentage', () => {
    const rijen = [rij({ verkoopprijs: 400_000, vraagprijs: null }), rij({ verkoopprijs: 500_000, vraagprijs: 480_000 })]
    const k = berekenVerkoopkaartKerncijfers(rijen)
    expect(k.pctBovenVraagprijs).toBe(100)
  })
})

describe('verkoopkaartSparklineReeks', () => {
  it('groepeert per kwartaal binnen het bereik, met 0/null voor lege kwartalen', () => {
    const van = 2024 * 4 + 0 // Q1
    const tot = 2024 * 4 + 2 // Q3
    const rijen = [
      rij({ verkoopdatum: '2024-01-10', verkoopprijs: 300_000, prijs_m2: 3_000 }),
      rij({ verkoopdatum: '2024-01-20', verkoopprijs: 340_000, prijs_m2: 3_400 }),
      // Q2 blijft leeg
      rij({ verkoopdatum: '2024-08-01', verkoopprijs: 500_000, prijs_m2: 5_000 }),
    ]
    const reeks = verkoopkaartSparklineReeks(rijen, van, tot)
    expect(reeks.kwartalen).toEqual(['2024-Q1', '2024-Q2', '2024-Q3'])
    expect(reeks.n).toEqual([2, 0, 1])
    expect(reeks.prijs[0]).toBe(320_000)
    expect(reeks.prijs[1]).toBeNull()
    expect(reeks.prijs[2]).toBe(500_000)
  })
})

describe('sorteerVerkopen', () => {
  const rijen = [
    rij({ id: 'a', verkoopdatum: '2024-01-01', verkoopprijs: 300_000, looptijd_dagen: 50 }),
    rij({ id: 'b', verkoopdatum: '2024-03-01', verkoopprijs: 500_000, looptijd_dagen: 10 }),
    rij({ id: 'c', verkoopdatum: '2024-02-01', verkoopprijs: 400_000, looptijd_dagen: 30 }),
  ]

  it('datum: nieuwste eerst', () => {
    expect(sorteerVerkopen(rijen, 'datum').map(r => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('prijs: hoogste eerst', () => {
    expect(sorteerVerkopen(rijen, 'prijs').map(r => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('looptijd: kortste eerst', () => {
    expect(sorteerVerkopen(rijen, 'looptijd').map(r => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('muteert de invoer niet', () => {
    const kopie = [...rijen]
    sorteerVerkopen(rijen, 'prijs')
    expect(rijen).toEqual(kopie)
  })
})
