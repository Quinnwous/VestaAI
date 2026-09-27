import { describe, it, expect, vi } from 'vitest'
import sharp from 'sharp'
import {
  naarMercator,
  resolutieOpZoom,
  mercatorNaarGlobalePixel,
  bepaalKaartKader,
  pixelInKader,
  benodigdeTegels,
  pdokTegelUrl,
  kaartReferenties,
  haalStatischeKaartAfbeelding,
  MERCATOR_GRENS,
} from './statischeKaart'

// i4 Housing/Wassenaar-achtige coördinaten, zelfde orde van grootte als de
// echte fixtures in WaardebepalingPdfTemplate.test.ts.
const SUBJECT = { lat: 52.1425, lng: 4.403 }
const REF_DICHTBIJ = { lat: 52.143, lng: 4.404 } // ~130 m
const REF_VER = { lat: 52.2, lng: 4.5 } // meerdere km

describe('naarMercator', () => {
  it('projecteert (0,0) op de oorsprong', () => {
    const { x, y } = naarMercator({ lat: 0, lng: 0 })
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(0, 6)
  })

  it('lng=180 valt op de mercator-grens', () => {
    const { x } = naarMercator({ lat: 0, lng: 180 })
    expect(x).toBeCloseTo(MERCATOR_GRENS, 3)
  })

  it('is monotoon: verder naar het noorden/oosten geeft een grotere x/y', () => {
    const a = naarMercator(SUBJECT)
    const b = naarMercator({ lat: SUBJECT.lat + 0.01, lng: SUBJECT.lng + 0.01 })
    expect(b.x).toBeGreaterThan(a.x)
    expect(b.y).toBeGreaterThan(a.y)
  })
})

describe('resolutieOpZoom', () => {
  it('halveert bij elk zoomniveau erbij', () => {
    const r10 = resolutieOpZoom(10)
    const r11 = resolutieOpZoom(11)
    expect(r11).toBeCloseTo(r10 / 2, 6)
  })

  it('komt overeen met de bekende PDOK/WMTS-tabel op EPSG:3857 (zoom 14 ≈ 9,55 m/px)', () => {
    expect(resolutieOpZoom(14)).toBeCloseTo(9.5546, 2)
  })
})

describe('mercatorNaarGlobalePixel', () => {
  it('de oorsprong (0,0) valt op het midden van de wereld op elk zoomniveau', () => {
    for (const zoom of [0, 5, 12, 18]) {
      const { px, py } = mercatorNaarGlobalePixel(0, 0, zoom)
      const wereld = 256 * 2 ** zoom
      expect(px).toBeCloseTo(wereld / 2, 3)
      expect(py).toBeCloseTo(wereld / 2, 3)
    }
  })

  it('noordwaarts (grotere y) geeft een kleinere py (pixel-y loopt naar het zuiden)', () => {
    const a = mercatorNaarGlobalePixel(0, 0, 14)
    const b = mercatorNaarGlobalePixel(0, 10000, 14)
    expect(b.py).toBeLessThan(a.py)
  })
})

describe('bepaalKaartKader', () => {
  it('geeft null bij een lege puntenlijst', () => {
    expect(bepaalKaartKader([])).toBeNull()
  })

  it('centreert het kader op het enige punt bij één punt', () => {
    const kader = bepaalKaartKader([SUBJECT], { breedtePx: 320, hoogtePx: 168 })!
    const { x: px, y: py } = pixelInKader(SUBJECT, kader)
    expect(px).toBeCloseTo(160, 0)
    expect(py).toBeCloseTo(84, 0)
  })

  it('kiest nooit een zoom lager dan minZoom, ook niet met wijd uiteen liggende punten', () => {
    const kader = bepaalKaartKader([SUBJECT, { lat: 53.5, lng: 6.5 }], { minZoom: 12, maxZoom: 18 })!
    expect(kader.zoom).toBeGreaterThanOrEqual(12)
  })

  it('respecteert minSpanMeter: één referentie op 5 m afstand toont niet een hele stad (zoom blijft hoog)', () => {
    const dichtbij = { lat: SUBJECT.lat, lng: SUBJECT.lng + 0.00005 }
    const kader = bepaalKaartKader([SUBJECT, dichtbij], { minSpanMeter: 350, maxZoom: 18 })!
    // Bij een minimale span van 350 m past dat nog op een hoge zoom (buurtniveau).
    expect(kader.zoom).toBeGreaterThanOrEqual(15)
  })

  it('kiest een lagere zoom als de punten samen niet binnen de ondergrens-zoom passen', () => {
    const kaderDichtbij = bepaalKaartKader([SUBJECT, REF_DICHTBIJ])!
    const kaderVer = bepaalKaartKader([SUBJECT, REF_VER])!
    expect(kaderVer.zoom).toBeLessThan(kaderDichtbij.zoom)
  })

  it('elk punt valt binnen de breedtePx/hoogtePx van het kader (marge werkt)', () => {
    const punten = [SUBJECT, REF_DICHTBIJ]
    const kader = bepaalKaartKader(punten, { breedtePx: 320, hoogtePx: 168 })!
    for (const p of punten) {
      const { x, y } = pixelInKader(p, kader)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(kader.breedtePx)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(kader.hoogtePx)
    }
  })
})

describe('benodigdeTegels', () => {
  it('geeft minstens 1 tegel en een aaneengesloten rechthoekig raster', () => {
    const kader = bepaalKaartKader([SUBJECT, REF_DICHTBIJ], { breedtePx: 320, hoogtePx: 168 })!
    const tegels = benodigdeTegels(kader)
    expect(tegels.length).toBeGreaterThan(0)
    const cols = new Set(tegels.map(t => t.col))
    const rows = new Set(tegels.map(t => t.row))
    expect(tegels.length).toBe(cols.size * rows.size)
  })

  it('clampt tegelindices binnen [0, 2^zoom - 1]', () => {
    // Kunstmatig kader net over de rand van de wereld heen.
    const kader = { zoom: 3, linksBovenPx: { px: -50, py: -50 }, breedtePx: 320, hoogtePx: 168 }
    const tegels = benodigdeTegels(kader)
    for (const t of tegels) {
      expect(t.col).toBeGreaterThanOrEqual(0)
      expect(t.row).toBeGreaterThanOrEqual(0)
      expect(t.col).toBeLessThanOrEqual(2 ** 3 - 1)
      expect(t.row).toBeLessThanOrEqual(2 ** 3 - 1)
    }
  })
})

describe('pdokTegelUrl', () => {
  it('bouwt de vaste PDOK WMTS-url met stijl/zoom/col/row', () => {
    const url = pdokTegelUrl({ zoom: 14, col: 8408, row: 5386 }, 'pastel')
    expect(url).toBe('https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/pastel/EPSG:3857/14/8408/5386.png')
  })

  it('valt terug op stijl "pastel"', () => {
    expect(pdokTegelUrl({ zoom: 1, col: 0, row: 0 })).toContain('/pastel/')
  })
})

describe('kaartReferenties', () => {
  it('nummert 1-based in de meegegeven volgorde en laat referenties zonder coördinaat vallen', () => {
    const coords = new Map([
      ['a', { lat: 52.1, lng: 4.4 }],
      ['c', { lat: 52.2, lng: 4.5 }],
    ])
    const resultaat = kaartReferenties([{ id: 'a' }, { id: 'b' }, { id: 'c' }], coords)
    expect(resultaat).toEqual([
      { id: 'a', nummer: 1, lat: 52.1, lng: 4.4 },
      { id: 'c', nummer: 3, lat: 52.2, lng: 4.5 },
    ])
  })

  it('geeft een lege lijst als geen enkele referentie een coördinaat heeft', () => {
    expect(kaartReferenties([{ id: 'x' }], new Map())).toEqual([])
  })
})

describe('haalStatischeKaartAfbeelding', () => {
  async function tegelPng(kleur: { r: number; g: number; b: number }): Promise<Buffer> {
    return sharp({ create: { width: 256, height: 256, channels: 4, background: { ...kleur, alpha: 1 } } }).png().toBuffer()
  }

  it('stelt de tegels samen en snijdt uit op de gevraagde afmetingen', async () => {
    const kader = bepaalKaartKader([SUBJECT, REF_DICHTBIJ], { breedtePx: 320, hoogtePx: 168 })!
    const png = await tegelPng({ r: 240, g: 200, b: 180 })
    const fetchImpl = vi.fn(async () => new Response(png, { status: 200 })) as unknown as typeof fetch

    const resultaat = await haalStatischeKaartAfbeelding(kader, { fetchImpl })
    expect(resultaat.ok).toBe(true)
    if (!resultaat.ok) return
    expect(resultaat.kaart.breedtePx).toBe(320)
    expect(resultaat.kaart.hoogtePx).toBe(168)
    const meta = await sharp(resultaat.kaart.png).metadata()
    expect(meta.width).toBe(320)
    expect(meta.height).toBe(168)
    expect(meta.format).toBe('png')
  })

  it('geeft { ok: false } zonder te throwen bij een mislukte tegel-fetch', async () => {
    const kader = bepaalKaartKader([SUBJECT])!
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 })) as unknown as typeof fetch

    const resultaat = await haalStatischeKaartAfbeelding(kader, { fetchImpl })
    expect(resultaat.ok).toBe(false)
    if (resultaat.ok) return
    expect(resultaat.reden).not.toMatch(/@/) // geen adres/e-mail-achtige data in de logtekst
  })

  it('geeft { ok: false } bij een timeout', async () => {
    const kader = bepaalKaartKader([SUBJECT])!
    const fetchImpl = vi.fn((_url: string, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        })
      }),
    ) as unknown as typeof fetch

    const resultaat = await haalStatischeKaartAfbeelding(kader, { fetchImpl, timeoutMs: 20 })
    expect(resultaat).toEqual({ ok: false, reden: 'timeout' })
  })
})
