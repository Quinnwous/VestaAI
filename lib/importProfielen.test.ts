import { describe, it, expect } from 'vitest'
import { mapRij, PROFIELEN } from './importProfielen'

describe('mapRij — realworks (wgs84)', () => {
  const headers = ['adres', 'postcode', 'plaats', 'lat', 'lng', 'verkoopprijs_kk', 'datum_ondertekening', 'soort_woonhuis', 'woonoppervlak']

  it('mapt via de basisaliassen + de realworks-extra-aliassen', () => {
    const rij = ['Hoofdstraat 1', '2242AB', 'Wassenaar', '52.146', '4.402', '750000', '15-03-2026', 'Tussenwoning', '120']
    const resultaat = mapRij(rij, headers, PROFIELEN.realworks)
    expect(resultaat).not.toBeNull()
    expect(resultaat!.adres).toBe('Hoofdstraat 1')
    expect(resultaat!.verkoopprijs).toBe(750000)
    expect(resultaat!.verkoopdatum).toBe('2026-03-15')
    expect(resultaat!.lat).toBeCloseTo(52.146, 3)
    expect(resultaat!.lng).toBeCloseTo(4.402, 3)
    expect(resultaat!.woningtype).toBe('Tussenwoning')
    expect(resultaat!.woonoppervlak_m2).toBe(120)
    expect(resultaat!.bron).toBe('realworks')
  })

  it('geeft null zonder adres-kolom of lege adreswaarde', () => {
    const rij = ['', '2242AB', 'Wassenaar', '52.146', '4.402', '750000', '15-03-2026', 'Tussenwoning', '120']
    expect(mapRij(rij, headers, PROFIELEN.realworks)).toBeNull()
  })
})

describe('mapRij — brainbay (rd)', () => {
  const headers = ['adres', 'postcode', 'plaats', 'x_coordinaat', 'y_coordinaat', 'koopsom', 'transactiedatum', 'aanbiedend_kantoor']

  it('zet RD X/Y om naar WGS84 lat/lng', () => {
    const rij = ['Dorpsstraat 12', '2243AB', 'Wassenaar', '155000', '463000', '500000', '01-06-2026', 'i4 Housing B.V.']
    const resultaat = mapRij(rij, headers, PROFIELEN.brainbay)
    expect(resultaat).not.toBeNull()
    expect(resultaat!.lat).toBeCloseTo(52.155172, 4)
    expect(resultaat!.lng).toBeCloseTo(5.387203, 4)
    expect(resultaat!.verkoopprijs).toBe(500000)
    expect(resultaat!.verkopend_kantoor).toBe('i4 Housing B.V.')
    expect(resultaat!.bron).toBe('brainbay')
  })

  it('laat lat/lng null als de RD-coördinaten buiten het plausibele bereik vallen', () => {
    const rij = ['Dorpsstraat 12', '2243AB', 'Wassenaar', '52.15', '5.38', '500000', '01-06-2026', 'i4 Housing B.V.']
    const resultaat = mapRij(rij, headers, PROFIELEN.brainbay)
    expect(resultaat!.lat).toBeNull()
    expect(resultaat!.lng).toBeNull()
  })

  it('leest aankopend_kantoor via de extra-veldaliassen', () => {
    const metAankoop = ['adres', 'postcode', 'plaats', 'x_coordinaat', 'y_coordinaat', 'koopsom', 'transactiedatum', 'aanbiedend_kantoor', 'aankopend_kantoor']
    const rij = ['Dorpsstraat 12', '2243AB', 'Wassenaar', '155000', '463000', '500000', '01-06-2026', 'Verkopend Kantoor', 'Kopend Kantoor']
    const resultaat = mapRij(rij, metAankoop, PROFIELEN.brainbay)
    expect(resultaat!.aankopend_kantoor).toBe('Kopend Kantoor')
  })
})
