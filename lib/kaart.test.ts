import { describe, it, expect } from 'vitest'
import {
  cirkelPolygoon,
  boundsUitPunten,
  verkopenNaarGeoJSON,
  clusterPunten,
  celGradenVoorZoom,
  pdokPastelStijl,
} from './kaart'

describe('cirkelPolygoon', () => {
  it('sluit de ring (eerste en laatste punt gelijk)', () => {
    const f = cirkelPolygoon([4.4025, 52.1443], 500)
    const ring = f.geometry.coordinates[0]
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })

  it('heeft segmenten + 1 punten', () => {
    const f = cirkelPolygoon([4.4025, 52.1443], 500, 32)
    expect(f.geometry.coordinates[0]).toHaveLength(33)
  })

  it('elk punt ligt ~straalM van het middelpunt (haversine-controle)', () => {
    const middelpunt: [number, number] = [4.4025, 52.1443]
    const straalM = 500
    const f = cirkelPolygoon(middelpunt, straalM, 16)
    const R = 6371000
    const toRad = (d: number) => (d * Math.PI) / 180
    for (const [lng, lat] of f.geometry.coordinates[0]) {
      const dLat = toRad(lat - middelpunt[1])
      const dLng = toRad(lng - middelpunt[0])
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(middelpunt[1])) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2
      const afstand = 2 * R * Math.asin(Math.sqrt(h))
      expect(afstand).toBeGreaterThan(straalM * 0.97)
      expect(afstand).toBeLessThan(straalM * 1.03)
    }
  })
})

describe('boundsUitPunten', () => {
  it('geeft null bij een lege lijst', () => {
    expect(boundsUitPunten([])).toBeNull()
  })

  it('geeft [punt, punt] bij één punt', () => {
    expect(boundsUitPunten([{ lat: 52.1, lng: 4.4 }])).toEqual([
      [4.4, 52.1],
      [4.4, 52.1],
    ])
  })

  it('vindt de juiste min/max over meerdere punten', () => {
    const bounds = boundsUitPunten([
      { lat: 52.1, lng: 4.4 },
      { lat: 52.3, lng: 4.2 },
      { lat: 52.0, lng: 4.6 },
    ])
    expect(bounds).toEqual([
      [4.2, 52.0],
      [4.6, 52.3],
    ])
  })
})

describe('verkopenNaarGeoJSON', () => {
  it('slaat transacties zonder coördinaten over', () => {
    const fc = verkopenNaarGeoJSON([
      { id: '1', lat: null, lng: 4.4, adres: 'A', verkoopprijs: 1, verkoopdatum: null, woonoppervlak_m2: null },
      { id: '2', lat: 52.1, lng: null, adres: 'B', verkoopprijs: 2, verkoopdatum: null, woonoppervlak_m2: null },
    ])
    expect(fc.features).toHaveLength(0)
  })

  it('zet lat/lng om naar GeoJSON [lng, lat] en neemt de velden over', () => {
    const fc = verkopenNaarGeoJSON([
      {
        id: 'abc',
        lat: 52.1443,
        lng: 4.4025,
        adres: 'Molenplein 2, Wassenaar',
        verkoopprijs: 750000,
        verkoopdatum: '2026-05-01',
        woonoppervlak_m2: 140,
      },
    ])
    expect(fc.features).toHaveLength(1)
    const [feature] = fc.features
    expect(feature.geometry.coordinates).toEqual([4.4025, 52.1443])
    expect(feature.properties).toEqual({
      id: 'abc',
      adres: 'Molenplein 2, Wassenaar',
      prijs: 750000,
      datum: '2026-05-01',
      m2: 140,
    })
  })
})

describe('clusterPunten', () => {
  it('gooit bij een niet-positieve celGraden', () => {
    expect(() => clusterPunten([], 0)).toThrow()
  })

  it('houdt ver-uit-elkaar-liggende punten gescheiden', () => {
    const clusters = clusterPunten(
      [
        { id: '1', lat: 52.0, lng: 4.0 },
        { id: '2', lat: 53.0, lng: 5.0 },
      ],
      0.01,
    )
    expect(clusters).toHaveLength(2)
    expect(clusters.map((c) => c.aantal)).toEqual([1, 1])
  })

  it('voegt dichtbij elkaar liggende punten samen tot één cluster op het gemiddelde', () => {
    const clusters = clusterPunten(
      [
        { id: '1', lat: 52.1, lng: 4.1 },
        { id: '2', lat: 52.1001, lng: 4.1001 },
        { id: '3', lat: 52.1002, lng: 4.1002 },
      ],
      0.05,
    )
    expect(clusters).toHaveLength(1)
    expect(clusters[0].aantal).toBe(3)
    expect(clusters[0].ids.sort()).toEqual(['1', '2', '3'])
    expect(clusters[0].lat).toBeCloseTo(52.1001, 3)
    expect(clusters[0].lng).toBeCloseTo(4.1001, 3)
  })
})

describe('celGradenVoorZoom', () => {
  it('levert een kleinere cel op bij een hogere zoom', () => {
    expect(celGradenVoorZoom(16)).toBeLessThan(celGradenVoorZoom(12))
  })

  it('is altijd positief', () => {
    expect(celGradenVoorZoom(0)).toBeGreaterThan(0)
    expect(celGradenVoorZoom(20)).toBeGreaterThan(0)
  })
})

describe('pdokPastelStijl', () => {
  it('gebruikt de PDOK BRT-vectortiles als enige bron', () => {
    const stijl = pdokPastelStijl()
    expect(Object.keys(stijl.sources)).toEqual(['brt'])
    const bron = stijl.sources.brt as { type: string; tiles: string[] }
    expect(bron.type).toBe('vector')
    expect(bron.tiles[0]).toContain('api.pdok.nl')
  })

  it('heeft geen hardgecodeerde merkkleur in de basiskaart (huisstijl komt uit de lagen erbovenop)', () => {
    const stijl = pdokPastelStijl()
    const json = JSON.stringify(stijl)
    expect(json).not.toMatch(/#0080C8|#C61E45/i)
  })
})
