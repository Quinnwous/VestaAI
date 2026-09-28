import { describe, it, expect } from 'vitest'
import {
  bboxTeGroot,
  parseBboxParam,
  buurtenItemsUrl,
  naarBuurtenGeoJSON,
  statusVoorHttpFout,
  MAX_BBOX_BREEDTE_GRADEN,
  type Bbox,
} from './buurtgrenzen'

describe('bboxTeGroot', () => {
  it('een normale viewport (Wassenaar-schaal) is niet te groot', () => {
    const bbox: Bbox = [4.35, 52.1, 4.45, 52.18]
    expect(bboxTeGroot(bbox)).toBe(false)
  })

  it('een bbox breder dan het plafond is te groot', () => {
    const bbox: Bbox = [3.3, 51.0, 3.3 + MAX_BBOX_BREEDTE_GRADEN + 0.1, 51.1]
    expect(bboxTeGroot(bbox)).toBe(true)
  })

  it('een bbox hoger dan het plafond is te groot (heel Nederland uitgezoomd)', () => {
    const bbox: Bbox = [3.3, 50.7, 3.6, 50.7 + MAX_BBOX_BREEDTE_GRADEN + 1]
    expect(bboxTeGroot(bbox)).toBe(true)
  })

  it('exact op het plafond is nog net niet te groot', () => {
    const bbox: Bbox = [0, 0, MAX_BBOX_BREEDTE_GRADEN, MAX_BBOX_BREEDTE_GRADEN]
    expect(bboxTeGroot(bbox)).toBe(false)
  })
})

describe('parseBboxParam', () => {
  it('parseert vier komma-gescheiden getallen', () => {
    expect(parseBboxParam('4.3,52.1,4.5,52.2')).toEqual([4.3, 52.1, 4.5, 52.2])
  })

  it('geeft null bij ontbrekende param', () => {
    expect(parseBboxParam(null)).toBeNull()
  })

  it('geeft null bij te weinig of te veel delen', () => {
    expect(parseBboxParam('4.3,52.1,4.5')).toBeNull()
    expect(parseBboxParam('4.3,52.1,4.5,52.2,1')).toBeNull()
  })

  it('geeft null bij niet-numerieke delen', () => {
    expect(parseBboxParam('a,b,c,d')).toBeNull()
  })

  it('geeft null als west >= east of south >= north (omgedraaide/lege bbox)', () => {
    expect(parseBboxParam('4.5,52.1,4.3,52.2')).toBeNull()
    expect(parseBboxParam('4.3,52.2,4.5,52.1')).toBeNull()
  })
})

describe('buurtenItemsUrl', () => {
  it('bouwt een PDOK-items-URL met bbox en limit', () => {
    const url = buurtenItemsUrl([4.3, 52.1, 4.5, 52.2])
    expect(url).toContain('https://api.pdok.nl/cbs/wijken-en-buurten-2024/ogc/v1/collections/buurten/items')
    expect(url).toContain('bbox=4.300000%2C52.100000%2C4.500000%2C52.200000')
    expect(url).toContain('f=json')
    expect(url).toContain('limit=')
  })
})

describe('naarBuurtenGeoJSON', () => {
  it('behoudt alleen de benodigde velden van een geldige respons', () => {
    const pdok = {
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[4.3, 52.1], [4.31, 52.1], [4.31, 52.11], [4.3, 52.1]]] },
          properties: {
            buurtcode: 'BU05189998',
            buurtnaam: 'Buitenwater',
            wijkcode: 'WK051899',
            gemeentenaam: "'s-Gravenhage",
            aantal_inwoners: -99997,
            aantal_bedrijfsvestigingen: -99997,
          },
        },
      ],
    }
    const uit = naarBuurtenGeoJSON(pdok)
    expect(uit).not.toBeNull()
    expect(uit!.features).toHaveLength(1)
    expect(uit!.features[0].properties).toEqual({
      buurtcode: 'BU05189998',
      buurtnaam: 'Buitenwater',
      wijkcode: 'WK051899',
      gemeentenaam: "'s-Gravenhage",
    })
    expect(uit!.features[0].properties).not.toHaveProperty('aantal_inwoners')
  })

  it('geeft een lege FeatureCollection (niet null) bij een geldige maar lege respons', () => {
    const uit = naarBuurtenGeoJSON({ features: [] })
    expect(uit).toEqual({ type: 'FeatureCollection', features: [] })
  })

  it('geeft null bij een onherkenbare vorm', () => {
    expect(naarBuurtenGeoJSON(null)).toBeNull()
    expect(naarBuurtenGeoJSON({})).toBeNull()
    expect(naarBuurtenGeoJSON({ features: 'niet-een-array' })).toBeNull()
    expect(naarBuurtenGeoJSON('gewoon een string')).toBeNull()
  })

  it('slaat features zonder geldige geometrie of buurtcode/-naam over', () => {
    const pdok = {
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [4.3, 52.1] }, properties: { buurtcode: 'x', buurtnaam: 'y' } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { buurtnaam: 'geen code' } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { buurtcode: 'geen naam' } },
      ],
    }
    expect(naarBuurtenGeoJSON(pdok)!.features).toHaveLength(0)
  })

  it('vult wijkcode/gemeentenaam met een lege string als die ontbreken', () => {
    const pdok = {
      features: [
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { buurtcode: 'BU1', buurtnaam: 'Test' } },
      ],
    }
    expect(naarBuurtenGeoJSON(pdok)!.features[0].properties).toEqual({
      buurtcode: 'BU1',
      buurtnaam: 'Test',
      wijkcode: '',
      gemeentenaam: '',
    })
  })
})

describe('statusVoorHttpFout', () => {
  it('4xx is leeg (bron bestaat, deze aanvraag levert niets op)', () => {
    expect(statusVoorHttpFout(404)).toBe('leeg')
    expect(statusVoorHttpFout(400)).toBe('leeg')
  })

  it('5xx en 429 zijn mislukt (retry kan wél iets opleveren)', () => {
    expect(statusVoorHttpFout(500)).toBe('mislukt')
    expect(statusVoorHttpFout(503)).toBe('mislukt')
    expect(statusVoorHttpFout(429)).toBe('mislukt')
  })
})
