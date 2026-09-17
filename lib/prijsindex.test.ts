import { describe, expect, it } from 'vitest'
import { bouwIndex, factor, glad, kwartaalNummer, kwartaalUitNummer, kwartaalVan, kwartalenTussen, maandenTussen } from './prijsindex'

describe('kwartalen', () => {
  it('bepaalt het kwartaal van een datum (UTC)', () => {
    expect(kwartaalVan('2026-03-31')).toBe('2026-Q1')
    expect(kwartaalVan('2026-04-01')).toBe('2026-Q2')
    expect(kwartaalVan('2026-12-31T23:00:00Z')).toBe('2026-Q4')
  })
  it('nummer en kwartaal zijn elkaars inverse', () => {
    for (const k of ['2019-Q1', '2024-Q3', '2026-Q4']) expect(kwartaalUitNummer(kwartaalNummer(k))).toBe(k)
    expect(kwartaalNummer('2026-Q1') - kwartaalNummer('2025-Q4')).toBe(1)
  })
  it('somt kwartalen inclusief op en geeft leeg bij omgekeerde volgorde', () => {
    expect(kwartalenTussen('2025-Q3', '2026-Q2')).toEqual(['2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2'])
    expect(kwartalenTussen('2026-Q2', '2025-Q3')).toEqual([])
  })
  it('telt hele maanden tussen datums', () => {
    expect(maandenTussen('2025-01-15', '2026-01-14')).toBe(11)
    expect(maandenTussen('2025-01-15', '2026-01-15')).toBe(12)
    expect(maandenTussen('2026-03-01', '2026-03-20')).toBe(0)
  })
})

describe('glad', () => {
  const ruw = [
    { kwartaal: '2025-Q1', n: 10, mediaanM2: 4000 },
    { kwartaal: '2025-Q2', n: 30, mediaanM2: 5000 },
    { kwartaal: '2025-Q3', n: 20, mediaanM2: 4500 },
  ]
  it('weegt het venster naar aantal verkopen en gebruikt 2 punten aan de randen', () => {
    const p = glad(ruw)
    expect(p[1].glad).toBeCloseTo((10 * 4000 + 30 * 5000 + 20 * 4500) / 60, 5)
    expect(p[1].nVenster).toBe(60)
    expect(p[0].glad).toBeCloseTo((10 * 4000 + 30 * 5000) / 40, 5)
    expect(p[2].glad).toBeCloseTo((30 * 5000 + 20 * 4500) / 50, 5)
  })
  it('markeert betrouwbaarheid op het venster-aantal, niet op het kwartaal zelf', () => {
    const p = glad(ruw, { minN: 30 })
    expect(p.map(x => x.betrouwbaar)).toEqual([true, true, true])
    expect(glad(ruw, { minN: 61 }).map(x => x.betrouwbaar)).toEqual([false, false, false])
  })
  it('overbrugt een leeg kwartaal zonder te crashen', () => {
    const p = glad([ruw[0], { kwartaal: '2025-Q2', n: 0, mediaanM2: null }, ruw[2]])
    expect(p[1].glad).toBeCloseTo((10 * 4000 + 20 * 4500) / 30, 5)
    expect(p[1].n).toBe(0)
  })
})

describe('bouwIndex', () => {
  const rij = (datum: string, prijs: number, m2: number) => ({ verkoopdatum: datum, verkoopprijs: prijs, woonoppervlak_m2: m2 })
  it('neemt de mediaan € per m² per kwartaal en slaat onbruikbare rijen over', () => {
    const reeks = bouwIndex([
      rij('2026-01-10', 400000, 100),
      rij('2026-02-10', 600000, 100),
      rij('2026-03-10', 500000, 100),
      rij('2026-04-10', 550000, 100),
      { verkoopdatum: null, verkoopprijs: 1, woonoppervlak_m2: 1 },
      { verkoopdatum: '2026-04-11', verkoopprijs: 1, woonoppervlak_m2: 0 },
    ])
    expect(reeks.punten.map(p => p.kwartaal)).toEqual(['2026-Q1', '2026-Q2'])
    expect(reeks.punten[0].mediaanM2).toBe(5000)
    expect(reeks.punten[0].n).toBe(3)
    expect(reeks.punten[1].n).toBe(1)
  })
  it('vult tussenliggende lege kwartalen aan en respecteert `tot`', () => {
    const reeks = bouwIndex([rij('2025-01-10', 400000, 100), rij('2025-09-10', 500000, 100)], { tot: '2025-Q4' })
    expect(reeks.punten.map(p => p.kwartaal)).toEqual(['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'])
    expect(reeks.punten[1].n).toBe(0)
  })
  it('geeft een lege reeks zonder bruikbare rijen', () => {
    expect(bouwIndex([]).punten).toEqual([])
  })
})

describe('factor', () => {
  const reeks = { minN: 30, venster: 3, punten: glad([
    { kwartaal: '2025-Q1', n: 40, mediaanM2: 4000 },
    { kwartaal: '2025-Q2', n: 40, mediaanM2: 4000 },
    { kwartaal: '2025-Q3', n: 40, mediaanM2: 4400 },
    { kwartaal: '2025-Q4', n: 40, mediaanM2: 4400 },
    { kwartaal: '2026-Q1', n: 5, mediaanM2: 9000 },
    { kwartaal: '2026-Q2', n: 0, mediaanM2: null },
    { kwartaal: '2026-Q3', n: 0, mediaanM2: null },
  ], { minN: 30 }) }
  it('is index(naar)/index(van) tussen betrouwbare kwartalen', () => {
    const f = factor(reeks, '2025-Q1', '2025-Q4')!
    expect(f.factor).toBeCloseTo(reeks.punten[3].glad! / reeks.punten[0].glad!, 6)
    expect(f.waarschuwing).toBeNull()
  })
  it('valt binnen 2 kwartalen terug op het dichtstbijzijnde betrouwbare kwartaal, met melding', () => {
    // 2026-Q2 heeft geen data; venster 2026-Q1..Q3 telt 5 verkopen → niet betrouwbaar → 2025-Q4 (1 kwartaal terug... via 2026-Q1? nee: 2026-Q1 venster = 40+5+0 = 45 → betrouwbaar)
    const f = factor(reeks, '2025-Q2', '2026-Q2')!
    expect(f.gebruiktNaar).toBe('2026-Q1')
    expect(f.waarschuwing).toContain('2026-Q2')
  })
  it('geeft null als er binnen de toegestane afstand geen betrouwbaar punt is', () => {
    expect(factor(reeks, '2025-Q2', '2026-Q3', { maxAfstandKwartalen: 1 })).toBeNull()
    expect(factor(reeks, '2019-Q1', '2025-Q4')).toBeNull()
  })
})
