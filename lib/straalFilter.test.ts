import { describe, it, expect } from 'vitest'
import { filterBinnenStraal } from './straalFilter'

const CENTRUM: [number, number] = [52.1443, 4.4025] // Wassenaar

function punt(id: string, lat: number | null, lng: number | null) {
  return { id, lat, lng }
}

describe('filterBinnenStraal', () => {
  it('houdt alleen punten binnen de straal over', () => {
    const dichtbij = punt('dichtbij', 52.1465, 4.4025) // ~245 m
    const ver = punt('ver', 52.16, 4.4025) // ~1750 m
    const resultaat = filterBinnenStraal([dichtbij, ver], CENTRUM, 500)
    expect(resultaat.map(r => r.id)).toEqual(['dichtbij'])
  })

  it('sorteert op afstand, dichtstbij eerst', () => {
    const a = punt('a', 52.1533, 4.4025) // ~1 km
    const b = punt('b', 52.1465, 4.4025) // ~245 m
    const c = punt('c', 52.1443, 4.4025) // 0 m (zelfde punt)
    const resultaat = filterBinnenStraal([a, b, c], CENTRUM, 1200)
    expect(resultaat.map(r => r.id)).toEqual(['c', 'b', 'a'])
  })

  it('slaat punten zonder coördinaten over', () => {
    const zonderLat = punt('zonder-lat', null, 4.4025)
    const zonderLng = punt('zonder-lng', 52.1465, null)
    const geldig = punt('geldig', 52.1465, 4.4025)
    const resultaat = filterBinnenStraal([zonderLat, zonderLng, geldig], CENTRUM, 500)
    expect(resultaat.map(r => r.id)).toEqual(['geldig'])
  })

  it('geeft een lege lijst als niets binnen de straal valt', () => {
    const ver = punt('ver', 52.2, 4.5)
    expect(filterBinnenStraal([ver], CENTRUM, 100)).toEqual([])
  })

  it('voegt afstandM toe aan elk resultaat', () => {
    const zelfdePunt = punt('zelfde', 52.1443, 4.4025)
    const [resultaat] = filterBinnenStraal([zelfdePunt], CENTRUM, 100)
    expect(resultaat.afstandM).toBe(0)
  })

  it('sluit een punt exact op de straalgrens niet uit (<=)', () => {
    // ~500 m noordelijk van het centrum
    const opGrens = punt('op-grens', 52.14879, 4.4025)
    const resultaat = filterBinnenStraal([opGrens], CENTRUM, 502)
    expect(resultaat.map(r => r.id)).toEqual(['op-grens'])
  })
})
