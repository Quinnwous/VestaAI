import { describe, it, expect } from 'vitest'
import { afstandMeters, kaderRondStraal } from './geo'

describe('afstandMeters', () => {
  it('geeft 0 voor hetzelfde punt', () => {
    expect(afstandMeters([52.1326, 4.4025], [52.1326, 4.4025])).toBe(0)
  })

  it('klopt bij bekende coördinaten in Wassenaar (Molenplein <-> Kerkstraat, ~1 km)', () => {
    // Molenplein 2, Wassenaar
    const molenplein: [number, number] = [52.1443, 4.4025]
    // ~1 km noordoostelijk
    const puntOpAfstand: [number, number] = [52.1533, 4.4025]
    const afstand = afstandMeters(molenplein, puntOpAfstand)
    expect(afstand).toBeGreaterThan(950)
    expect(afstand).toBeLessThan(1050)
  })

  it('binnen 500m straal herkent een dichtbijzijnd punt', () => {
    const centrum: [number, number] = [52.1443, 4.4025]
    const dichtbij: [number, number] = [52.1465, 4.4025] // ~245 m
    expect(afstandMeters(centrum, dichtbij)).toBeLessThan(500)
  })

  it('buiten 500m straal herkent een ver punt', () => {
    const centrum: [number, number] = [52.1443, 4.4025]
    const ver: [number, number] = [52.16, 4.4025] // ~1750 m
    expect(afstandMeters(centrum, ver)).toBeGreaterThan(500)
  })
})

describe('kaderRondStraal', () => {
  it('omvat de hele cirkel met marge, in alle vier de richtingen', () => {
    const [[w, z], [o, n]] = kaderRondStraal(52.08, 4.39, 500)
    expect(afstandMeters([52.08, 4.39], [n, 4.39])).toBeCloseTo(650, -1)
    expect(afstandMeters([52.08, 4.39], [z, 4.39])).toBeCloseTo(650, -1)
    expect(afstandMeters([52.08, 4.39], [52.08, o])).toBeCloseTo(650, -1)
    expect(afstandMeters([52.08, 4.39], [52.08, w])).toBeCloseTo(650, -1)
  })
  it('groeit mee met de straal', () => {
    const klein = kaderRondStraal(52, 4, 100)
    const groot = kaderRondStraal(52, 4, 1000)
    expect(groot[1][0] - groot[0][0]).toBeCloseTo((klein[1][0] - klein[0][0]) * 10, 8)
  })
})
