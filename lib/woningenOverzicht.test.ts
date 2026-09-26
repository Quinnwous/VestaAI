import { describe, expect, it } from 'vitest'
import { berekenKaartBounds, sorteerOptieNaarOrderBy, telPerFase } from './woningenOverzicht'

describe('sorteerOptieNaarOrderBy', () => {
  it('sorteert nieuwste eerst op created_at aflopend (standaard)', () => {
    expect(sorteerOptieNaarOrderBy('nieuwste')).toEqual({ column: 'created_at', ascending: false })
  })

  it('sorteert oudste eerst op created_at oplopend', () => {
    expect(sorteerOptieNaarOrderBy('oudste')).toEqual({ column: 'created_at', ascending: true })
  })

  it('sorteert op adres a-z', () => {
    expect(sorteerOptieNaarOrderBy('adres')).toEqual({ column: 'address', ascending: true })
  })

  it('valt terug op nieuwste bij een onbekende/verouderde URL-waarde', () => {
    expect(sorteerOptieNaarOrderBy('iets-ongeldigs')).toEqual({ column: 'created_at', ascending: false })
  })
})

describe('berekenKaartBounds', () => {
  it('geeft null zonder punten', () => {
    expect(berekenKaartBounds([])).toBeNull()
  })

  it('omvat alle punten met [[minLng,minLat],[maxLng,maxLat]]', () => {
    const bounds = berekenKaartBounds([
      { lat: 52.14, lng: 4.40 },
      { lat: 52.20, lng: 4.35 },
      { lat: 52.10, lng: 4.50 },
    ])
    expect(bounds).not.toBeNull()
    const [[minLng, minLat], [maxLng, maxLat]] = bounds!
    expect(minLng).toBeCloseTo(4.35)
    expect(maxLng).toBeCloseTo(4.50)
    expect(minLat).toBeCloseTo(52.10)
    expect(maxLat).toBeCloseTo(52.20)
  })

  it('geeft een minimumspreiding rond één enkel punt, niet een bounds van nul breed', () => {
    const bounds = berekenKaartBounds([{ lat: 52.14, lng: 4.40 }])
    expect(bounds).not.toBeNull()
    const [[minLng, minLat], [maxLng, maxLat]] = bounds!
    expect(maxLng - minLng).toBeGreaterThan(0)
    expect(maxLat - minLat).toBeGreaterThan(0)
    expect((minLng + maxLng) / 2).toBeCloseTo(4.40)
    expect((minLat + maxLat) / 2).toBeCloseTo(52.14)
  })

  it('geeft ook een minimumspreiding bij meerdere identieke punten', () => {
    const bounds = berekenKaartBounds([
      { lat: 52.14, lng: 4.40 },
      { lat: 52.14, lng: 4.40 },
    ])
    const [[minLng, minLat], [maxLng, maxLat]] = bounds!
    expect(maxLng).toBeGreaterThan(minLng)
    expect(maxLat).toBeGreaterThan(minLat)
  })
})

describe('telPerFase', () => {
  it('telt elke fase apart en geeft 0 voor een fase zonder dossiers', () => {
    const telling = telPerFase([
      { fase: 'in_verkoop' },
      { fase: 'in_verkoop' },
      { fase: 'verkocht' },
    ])
    expect(telling).toEqual({ verkoopadvies: 0, in_verkoop: 2, verkocht: 1 })
  })

  it('geeft nullen voor een lege lijst', () => {
    expect(telPerFase([])).toEqual({ verkoopadvies: 0, in_verkoop: 0, verkocht: 0 })
  })
})
