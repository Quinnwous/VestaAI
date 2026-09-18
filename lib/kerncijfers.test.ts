import { describe, it, expect } from 'vitest'
import {
  filterOpLaatsteMaanden,
  tellFases,
  filterOpJaar,
  berekenVerkoopstatistieken,
  berekenVerkochtMetDelta,
  vergelijkLooptijdMetMarkt,
  berekenMarktaandeel,
  filterOpPlaatsLaatste12Mnd,
  plaatsSleutel,
  plaatsenGelijk,
  plaatsVarianten,
  type EigenVerkoopPlaatsRow,
} from './kerncijfers'

describe('filterOpLaatsteMaanden', () => {
  const nu = new Date('2026-09-17T00:00:00Z')

  it('houdt rijen binnen de periode, op basis van de opgegeven datumVeld-accessor', () => {
    const rows = [{ created_at: '2026-08-01T00:00:00Z' }, { created_at: '2025-01-01T00:00:00Z' }]
    expect(filterOpLaatsteMaanden(rows, 12, r => r.created_at, nu)).toEqual([{ created_at: '2026-08-01T00:00:00Z' }])
  })

  it('sluit rijen zonder datum uit', () => {
    const rows = [{ created_at: null }, { created_at: undefined }]
    expect(filterOpLaatsteMaanden(rows, 12, r => r.created_at, nu)).toEqual([])
  })

  it('werkt ook op verkoopdatum (kerncijfer-tegel "Prijs t.o.v. vraagprijs", 1.9c)', () => {
    const rows = [
      { verkoopdatum: '2026-06-01' },
      { verkoopdatum: '2024-01-01' },
      { verkoopdatum: null },
    ]
    expect(filterOpLaatsteMaanden(rows, 12, r => r.verkoopdatum, nu)).toEqual([{ verkoopdatum: '2026-06-01' }])
  })
})

describe('tellFases', () => {
  it('telt per fase', () => {
    const rows = [{ fase: 'verkoopadvies' }, { fase: 'verkoopadvies' }, { fase: 'in_verkoop' }, { fase: 'verkocht' }]
    expect(tellFases(rows)).toEqual({ verkoopadvies: 2, inVerkoop: 1, verkocht: 1 })
  })

  it('geeft nullen bij een lege lijst', () => {
    expect(tellFases([])).toEqual({ verkoopadvies: 0, inVerkoop: 0, verkocht: 0 })
  })
})

describe('filterOpJaar', () => {
  it('filtert op verkoopjaar', () => {
    const rows = [
      { verkoopprijs: 100, vraagprijs: 100, looptijd_dagen: 10, verkoopdatum: '2026-03-01' },
      { verkoopprijs: 100, vraagprijs: 100, looptijd_dagen: 10, verkoopdatum: '2025-03-01' },
      { verkoopprijs: 100, vraagprijs: 100, looptijd_dagen: 10, verkoopdatum: null },
    ]
    expect(filterOpJaar(rows, 2026)).toHaveLength(1)
  })
})

describe('berekenVerkoopstatistieken', () => {
  it('berekent gemiddelde looptijd en prijs t.o.v. vraagprijs', () => {
    const rows = [
      { verkoopprijs: 110_000, vraagprijs: 100_000, looptijd_dagen: 20, verkoopdatum: '2026-01-01' },
      { verkoopprijs: 95_000, vraagprijs: 100_000, looptijd_dagen: 40, verkoopdatum: '2026-02-01' },
    ]
    const res = berekenVerkoopstatistieken(rows)
    expect(res.aantal).toBe(2)
    expect(res.gemLooptijdDagen).toBe(30)
    // (+10% en -5%) / 2 = +2.5%
    expect(res.gemPrijsTovVraagprijsPct).toBe(2.5)
  })

  it('negeert rijen zonder vraagprijs voor het prijspercentage, maar telt de looptijd wel mee', () => {
    const rows = [
      { verkoopprijs: 100_000, vraagprijs: null, looptijd_dagen: 15, verkoopdatum: '2026-01-01' },
    ]
    const res = berekenVerkoopstatistieken(rows)
    expect(res.gemLooptijdDagen).toBe(15)
    expect(res.gemPrijsTovVraagprijsPct).toBeNull()
  })

  it('geeft nullen zonder data, geen schijnzeker gemiddelde', () => {
    const res = berekenVerkoopstatistieken([])
    expect(res).toEqual({ aantal: 0, gemLooptijdDagen: null, gemPrijsTovVraagprijsPct: null })
  })
})

describe('berekenVerkochtMetDelta', () => {
  const nu = new Date('2026-09-17T00:00:00Z')

  it('telt de laatste 12 maanden en de 12 maanden daarvoor apart, en berekent de delta', () => {
    const rows = [
      // laatste 12 mnd (na 2025-09-17): 2 rijen
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2026-06-01' },
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2025-10-01' },
      // vorige 12 mnd (2024-09-17 t/m 2025-09-17): 4 rijen
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2025-01-01' },
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2025-05-01' },
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2024-10-01' },
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2024-12-01' },
      // meer dan 24 mnd terug: telt nergens mee
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2023-01-01' },
    ]
    const res = berekenVerkochtMetDelta(rows, nu)
    expect(res.aantal).toBe(2)
    expect(res.vorigAantal).toBe(4)
    // (2 - 4) / 4 * 100 = -50%
    expect(res.deltaPct).toBe(-50)
  })

  it('geeft geen delta (null) zonder vorige periode om tegen af te zetten', () => {
    const rows = [{ verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2026-06-01' }]
    const res = berekenVerkochtMetDelta(rows, nu)
    expect(res).toEqual({ aantal: 1, vorigAantal: 0, deltaPct: null })
  })

  it('geeft nullen/nul zonder data, geen NaN', () => {
    expect(berekenVerkochtMetDelta([], nu)).toEqual({ aantal: 0, vorigAantal: 0, deltaPct: null })
  })
})

describe('vergelijkLooptijdMetMarkt', () => {
  it('berekent het verschil (eigen − markt), negatief = sneller dan de markt', () => {
    expect(vergelijkLooptijdMetMarkt(26, 36)).toEqual({ eigenGemLooptijd: 26, marktGemLooptijd: 36, deltaDagen: -10 })
  })

  it('geeft null bij ontbrekende eigen- of marktwaarde', () => {
    expect(vergelijkLooptijdMetMarkt(null, 36).deltaDagen).toBeNull()
    expect(vergelijkLooptijdMetMarkt(26, null).deltaDagen).toBeNull()
  })
})

describe('berekenMarktaandeel', () => {
  it('berekent het percentage eigen t.o.v. de markt', () => {
    expect(berekenMarktaandeel(23, 97)).toEqual({ eigenN: 23, marktN: 97, aandeelPct: 23.7 })
  })

  it('geeft null i.p.v. te delen door 0 zonder markttransacties', () => {
    expect(berekenMarktaandeel(0, 0)).toEqual({ eigenN: 0, marktN: 0, aandeelPct: null })
  })
})

describe('filterOpPlaatsLaatste12Mnd', () => {
  const nu = new Date('2026-09-17T00:00:00Z')

  it('filtert op plaats én periode', () => {
    const rows: EigenVerkoopPlaatsRow[] = [
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2026-06-01', plaats: 'Wassenaar' },
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2026-06-01', plaats: 'Voorschoten' },
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2024-01-01', plaats: 'Wassenaar' },
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2026-06-01', plaats: null },
    ]
    expect(filterOpPlaatsLaatste12Mnd(rows, 'Wassenaar', nu)).toHaveLength(1)
  })

  it('matcht plaatsnamen spelling-ongevoelig (via plaatsenGelijk)', () => {
    const rows: EigenVerkoopPlaatsRow[] = [
      { verkoopprijs: 1, vraagprijs: 1, looptijd_dagen: 1, verkoopdatum: '2026-06-01', plaats: 'Den Haag' },
    ]
    expect(filterOpPlaatsLaatste12Mnd(rows, "'s-Gravenhage", nu)).toHaveLength(1)
  })
})

describe('plaatsnaam-normalisatie', () => {
  it('plaatsSleutel negeert hoofdletters, apostrofs, koppeltekens en diakrieten', () => {
    expect(plaatsSleutel('Wassenaar')).toBe(plaatsSleutel('wassenaar'))
    expect(plaatsSleutel("'s-Gravenhage")).toBe(plaatsSleutel('s Gravenhage'))
  })

  it("plaatsenGelijk herkent 's-Gravenhage en Den Haag als dezelfde plaats", () => {
    expect(plaatsenGelijk("'s-Gravenhage", 'Den Haag')).toBe(true)
    expect(plaatsenGelijk('Wassenaar', 'Voorschoten')).toBe(false)
  })

  it('plaatsVarianten geeft de bekende aliassen mee voor een RPC-filter', () => {
    expect(plaatsVarianten("'s-Gravenhage")).toEqual(["'s-Gravenhage", 'Den Haag'])
    expect(plaatsVarianten('Den Haag')).toEqual(['Den Haag', "'s-Gravenhage"])
  })

  it('plaatsVarianten geeft alleen de plaats zelf terug zonder bekende alias', () => {
    expect(plaatsVarianten('Wassenaar')).toEqual(['Wassenaar'])
  })
})
