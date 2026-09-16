import { describe, it, expect } from 'vitest'
import { afstandMeters } from './geo'

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
