import { describe, expect, it } from 'vitest'
import {
  standaardTransactiesFilterState,
  transactiesFilterNaarTransactieFilter,
  transactiesFilterNaarEigenFilter,
  filtreerEigenVoorExport,
  sorteringVoorRpc,
  volgendeSortering,
  isSorteerbareKolom,
  verkochtDoorLabel,
  ratioTovVraagprijs,
  bouwTransactiesCsv,
  LOOPTIJD_MAX_STANDAARD,
} from './transactiesZoeken'
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

describe('standaardTransactiesFilterState', () => {
  it('start met het werkgebied van het kantoor, geen overige filters, sortering op verkoopdatum aflopend, pagina 1', () => {
    const f = standaardTransactiesFilterState(['wassenaar', 'voorschoten'])
    expect(f.plaatsen).toEqual(['wassenaar', 'voorschoten'])
    expect(f.wijken).toEqual([])
    expect(f.alleenEigen).toBe(false)
    expect(f.zoek).toBe('')
    expect(f.sortKey).toBe('verkoopdatum')
    expect(f.sortDir).toBe('desc')
    expect(f.pagina).toBe(1)
  })
})

describe('transactiesFilterNaarTransactieFilter', () => {
  const datumTot = '2026-09-12'

  it('standaardfilter (24 mnd) zet alleen plaatsen + periode-datums', () => {
    const f = standaardTransactiesFilterState(['wassenaar'])
    const rpc = transactiesFilterNaarTransactieFilter(f, { datumTot })
    expect(rpc.plaatsen).toEqual(['wassenaar'])
    expect(rpc.datum_van).toBe('2024-09-13')
    expect(rpc.datum_tot).toBe(datumTot)
    expect(rpc.prijs_min).toBeUndefined()
    expect(rpc.zoek).toBeUndefined()
  })

  it('een handmatig datumbereik overschrijft de periode-preset', () => {
    const f = { ...standaardTransactiesFilterState([]), datumVan: '2020-01-01', datumTot: '2020-12-31' }
    const rpc = transactiesFilterNaarTransactieFilter(f, { datumTot })
    expect(rpc.datum_van).toBe('2020-01-01')
    expect(rpc.datum_tot).toBe('2020-12-31')
  })

  it('prijs/opp/bouwjaar/perceel-bereiken worden alleen gezet als ze van de standaard afwijken', () => {
    const f = { ...standaardTransactiesFilterState([]), prijs: [200_000, 800_000] as [number, number] }
    const rpc = transactiesFilterNaarTransactieFilter(f, { datumTot: null })
    expect(rpc.prijs_min).toBe(200_000)
    expect(rpc.prijs_max).toBe(800_000)
  })

  it('een bovengrens op de rand van het bereik ("geen max") laat prijs_max weg', () => {
    const f = { ...standaardTransactiesFilterState([]), prijs: [200_000, 5_000_000] as [number, number] }
    const rpc = transactiesFilterNaarTransactieFilter(f, { datumTot: null })
    expect(rpc.prijs_min).toBe(200_000)
    expect(rpc.prijs_max).toBeUndefined()
  })

  it('alleenEigen -> alleen_eigen: true, anders weggelaten', () => {
    const aan = transactiesFilterNaarTransactieFilter({ ...standaardTransactiesFilterState([]), alleenEigen: true }, { datumTot: null })
    expect(aan.alleen_eigen).toBe(true)
    const uit = transactiesFilterNaarTransactieFilter(standaardTransactiesFilterState([]), { datumTot: null })
    expect(uit.alleen_eigen).toBeUndefined()
  })

  it('looptijdMax onder de standaard komt door, op de standaard wordt weggelaten', () => {
    const f = { ...standaardTransactiesFilterState([]), looptijdMax: 90 }
    expect(transactiesFilterNaarTransactieFilter(f, { datumTot: null }).looptijd_max).toBe(90)
    expect(transactiesFilterNaarTransactieFilter(standaardTransactiesFilterState([]), { datumTot: null }).looptijd_max).toBeUndefined()
    expect(LOOPTIJD_MAX_STANDAARD).toBe(365)
  })

  it('zoekveld wordt getrimd en alleen gezet als niet leeg', () => {
    const f = { ...standaardTransactiesFilterState([]), zoek: '  Kerkstraat  ' }
    expect(transactiesFilterNaarTransactieFilter(f, { datumTot: null }).zoek).toBe('Kerkstraat')
    expect(transactiesFilterNaarTransactieFilter({ ...standaardTransactiesFilterState([]), zoek: '   ' }, { datumTot: null }).zoek).toBeUndefined()
  })
})

describe('transactiesFilterNaarEigenFilter + filtreerEigenVoorExport', () => {
  const rijen: TransactieRow[] = [
    rij({ id: 'a', adres: 'Kerkstraat 1', looptijd_dagen: 10 }),
    rij({ id: 'b', adres: 'Dorpsstraat 2', looptijd_dagen: 200 }),
    rij({ id: 'c', adres: 'Kerkstraat 3', plaats: 'Voorschoten', looptijd_dagen: 5 }),
  ]

  it('past dezelfde plaatsfilter toe als de RPC-conversie (eigen verkopen client-side)', () => {
    const f = { ...standaardTransactiesFilterState(['Wassenaar']), periode: 0 as const }
    const resultaat = filtreerEigenVoorExport(rijen, f, { datumTot: null })
    expect(resultaat.map(r => r.id)).toEqual(['a', 'b'])
  })

  it('looptijdMax filtert rijen zonder of met een te lange looptijd eruit', () => {
    const f = { ...standaardTransactiesFilterState([]), periode: 0 as const, looptijdMax: 30 }
    const resultaat = filtreerEigenVoorExport(rijen, f, { datumTot: null })
    expect(resultaat.map(r => r.id).sort()).toEqual(['a', 'c'])
  })

  it('zoekveld filtert op adres, case-insensitive', () => {
    const f = { ...standaardTransactiesFilterState([]), periode: 0 as const, zoek: 'kerkstraat' }
    const resultaat = filtreerEigenVoorExport(rijen, f, { datumTot: null })
    expect(resultaat.map(r => r.id).sort()).toEqual(['a', 'c'])
  })
})

describe('sortering: volgendeSortering + sorteringVoorRpc', () => {
  it('klikken op een nieuwe kolom kiest de standaardrichting van die kolom', () => {
    expect(volgendeSortering({ sortKey: 'verkoopdatum', sortDir: 'desc' }, 'prijs')).toEqual({ sortKey: 'prijs', sortDir: 'desc' })
    expect(volgendeSortering({ sortKey: 'verkoopdatum', sortDir: 'desc' }, 'adres')).toEqual({ sortKey: 'adres', sortDir: 'asc' })
    expect(volgendeSortering({ sortKey: 'verkoopdatum', sortDir: 'desc' }, 'looptijd')).toEqual({ sortKey: 'looptijd', sortDir: 'asc' })
  })

  it('nogmaals klikken op de actieve kolom toggelt de richting', () => {
    expect(volgendeSortering({ sortKey: 'prijs', sortDir: 'desc' }, 'prijs')).toEqual({ sortKey: 'prijs', sortDir: 'asc' })
    expect(volgendeSortering({ sortKey: 'prijs', sortDir: 'asc' }, 'prijs')).toEqual({ sortKey: 'prijs', sortDir: 'desc' })
  })

  it('elke sorteerbare kolom mapt naar een geldige Sortering-sleutel per richting', () => {
    expect(sorteringVoorRpc('prijs', 'desc')).toBe('prijs_desc')
    expect(sorteringVoorRpc('prijs', 'asc')).toBe('prijs_asc')
    expect(sorteringVoorRpc('m2', 'desc')).toBe('m2_desc')
    expect(sorteringVoorRpc('verkochtDoor', 'asc')).toBe('verkochtdoor_asc')
    expect(sorteringVoorRpc('plaatswijk', 'desc')).toBe('plaats_desc')
  })

  it('een onbekende sleutel valt terug op verkoopdatum_desc', () => {
    expect(sorteringVoorRpc('onbekend', 'asc')).toBe('verkoopdatum_desc')
  })

  it('isSorteerbareKolom herkent alleen de gedefinieerde DataTable-kolommen', () => {
    expect(isSorteerbareKolom('prijs')).toBe(true)
    expect(isSorteerbareKolom('foo')).toBe(false)
  })
})

describe('verkochtDoorLabel', () => {
  it('toont de eigen kantoornaam bij een eigen verkoop', () => {
    expect(verkochtDoorLabel(rij({ eigen_verkoop: true, verkopend_kantoor_norm: null, verkopend_kantoor: null }), 'i4 Housing')).toBe('i4 Housing')
  })

  it('toont de genormaliseerde kantoornaam bij een externe verkoop', () => {
    expect(verkochtDoorLabel(rij({ eigen_verkoop: false, verkopend_kantoor_norm: 'Huys & Partners', verkopend_kantoor: 'huys partners makelaardij' }), 'i4 Housing')).toBe('Huys & Partners')
  })

  it('valt terug op de ruwe kantoornaam, dan op "Onbekend"', () => {
    expect(verkochtDoorLabel(rij({ eigen_verkoop: false, verkopend_kantoor_norm: null, verkopend_kantoor: 'Ten Holt' }), 'i4 Housing')).toBe('Ten Holt')
    expect(verkochtDoorLabel(rij({ eigen_verkoop: false, verkopend_kantoor_norm: null, verkopend_kantoor: null }), 'i4 Housing')).toBe('Onbekend')
  })
})

describe('ratioTovVraagprijs', () => {
  it('berekent het percentage boven/onder de vraagprijs', () => {
    expect(ratioTovVraagprijs({ verkoopprijs: 550_000, vraagprijs: 500_000 })).toBeCloseTo(10)
    expect(ratioTovVraagprijs({ verkoopprijs: 450_000, vraagprijs: 500_000 })).toBeCloseTo(-10)
  })

  it('geeft null zonder prijs/vraagprijs of bij vraagprijs 0', () => {
    expect(ratioTovVraagprijs({ verkoopprijs: null, vraagprijs: 500_000 })).toBeNull()
    expect(ratioTovVraagprijs({ verkoopprijs: 500_000, vraagprijs: null })).toBeNull()
    expect(ratioTovVraagprijs({ verkoopprijs: 500_000, vraagprijs: 0 })).toBeNull()
  })
})

describe('bouwTransactiesCsv', () => {
  it('bouwt een kopregel + één rij per transactie, ;-gescheiden', () => {
    const csv = bouwTransactiesCsv([rij({ adres: 'Kerkstraat 1', verkoopprijs: 500_000, tuin: true })])
    const regels = csv.split('\r\n')
    expect(regels[0]).toContain('Adres')
    expect(regels[0]).toContain('Verkoopprijs')
    expect(regels[1]).toContain('Kerkstraat 1')
    expect(regels[1]).toContain('500000')
    expect(regels[1]).toContain('Ja') // tuin: true
  })

  it('escaped puntkomma\'s en aanhalingstekens in een veld', () => {
    const csv = bouwTransactiesCsv([rij({ adres: 'Kerkstraat 1; achterom "de hoek"' })])
    expect(csv).toContain('"Kerkstraat 1; achterom ""de hoek"""')
  })

  it('lege dataset geeft alleen de kopregel', () => {
    const csv = bouwTransactiesCsv([])
    expect(csv.split('\r\n')).toHaveLength(1)
  })
})
