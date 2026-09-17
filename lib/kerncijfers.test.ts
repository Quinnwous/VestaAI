import { describe, it, expect } from 'vitest'
import {
  filterOpLaatsteMaanden,
  tellFases,
  filterOpJaar,
  berekenVerkoopstatistieken,
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
