/**
 * Statische locatiekaart voor de waardebepaling-pdf (roadmap § 9, vooruitgehaald
 * naar scène 4 van de demo — item 4.7 breidt uit). Toont het subject en de
 * genummerde referenties (zelfde nummers als de referentietabel) op één
 * kleine, samengestelde PDOK-kaartafbeelding.
 *
 * Twee lagen, bewust gescheiden:
 * 1. Pure projectie-/kaderwiskunde hieronder (`bepaalKaartKader`,
 *    `pixelInKader`, `benodigdeTegels`, …) — geen netwerk, met vitest-tests
 *    in `lib/statischeKaart.test.ts`.
 * 2. `haalStatischeKaartAfbeelding()` onderaan: haalt de PDOK-tegels op (met
 *    timeout) en stelt ze met `sharp` (al een dependency, zie
 *    `app/api/fotos/staging/route.ts`) samen tot één PNG-buffer, uitgesneden
 *    op het kader. Geen nieuwe npm-dependency nodig.
 *
 * De pins zelf (subject + genummerde referenties) worden niet hier getekend
 * maar als een `<Svg>`-laag over deze PNG heen in `WaardebepalingPdfTemplate.tsx`
 * (react-pdf) — dat template rekent niets uit, het gebruikt kant-en-klare
 * pixelposities uit `pixelInKader`/`kaartReferenties`. `subjectPinStijl()`
 * hieronder is wél hier gedefinieerd (pure kleurlogica, dus met de andere pure
 * functies in dit bestand) en levert de vul-/randkleur die dat template voor
 * de subject-pin moet gebruiken.
 *
 * Ondergrond: PDOK BRT-Achtergrondkaart, stijl "pastel" (zelfde stijlkeuze
 * als de interactieve MapLibre-kaart, § 3.5 / besluit 17 sep 2026) — maar
 * hier via **WMTS-tegels**, niet WMS GetMap: de GetCapabilities van
 * `service.pdok.nl/kadaster/brt-achtergrondkaart/wms/...` bestaat niet (404,
 * gecontroleerd 28 sep 2026); BRT-Achtergrondkaart wordt alléén ontsloten als
 * WMTS (bevestigd via een echte GetCapabilities-call) en als OGC-vectortiles
 * (die de interactieve kaart al gebruikt). Tegels samenstellen was dus de
 * eenvoudigere weg uit de opdracht. Standaard Web Mercator-tegelraster
 * (EPSG:3857, 256×256 px, TopLeftCorner (-20037508.3428, 20037508.3428)) —
 * dezelfde rekenwijze als OSM/Google-tegels.
 */

import { VESTA_MERK, luminantie, lichter } from './branding'

const TEGEL_PX = 256
const AARDE_STRAAL_M = 6378137
/** Halve omtrek van de Web Mercator-projectie (± 20037508.3428 m) — ook de x/y-grens van de kaart. */
export const MERCATOR_GRENS = Math.PI * AARDE_STRAAL_M

export const PDOK_WMTS_STIJLEN = ['pastel', 'standaard', 'grijs'] as const
export type PdokStijl = (typeof PDOK_WMTS_STIJLEN)[number]

/** `{stijl}/{z}/{col}/{row}` — bevestigd met een echte GetCapabilities- en tegel-call (28 sep 2026). */
const PDOK_WMTS_TEMPLATE =
  'https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/{stijl}/EPSG:3857/{z}/{col}/{row}.png'

export type Punt = { lat: number; lng: number }

/** WGS84 lat/lng → Web Mercator (meters, EPSG:3857). */
export function naarMercator({ lat, lng }: Punt): { x: number; y: number } {
  const x = ((lng * Math.PI) / 180) * AARDE_STRAAL_M
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * AARDE_STRAAL_M
  return { x, y }
}

/** Resolutie (meter/pixel) van een WMTS-zoomniveau op het standaard 256px-tegelraster. */
export function resolutieOpZoom(zoom: number): number {
  return (2 * MERCATOR_GRENS) / (TEGEL_PX * 2 ** zoom)
}

/** Mercator-meters → globale pixelcoördinaat op zoomniveau `zoom` (hele wereld = 256·2^zoom px, oorsprong linksboven). */
export function mercatorNaarGlobalePixel(x: number, y: number, zoom: number): { px: number; py: number } {
  const wereld = TEGEL_PX * 2 ** zoom
  const px = ((x + MERCATOR_GRENS) / (2 * MERCATOR_GRENS)) * wereld
  const py = ((MERCATOR_GRENS - y) / (2 * MERCATOR_GRENS)) * wereld
  return { px, py }
}

export type KaartKader = {
  zoom: number
  /** globale pixelcoördinaat (op `zoom`) van de linkerbovenhoek van het uit te snijden beeld */
  linksBovenPx: { px: number; py: number }
  breedtePx: number
  hoogtePx: number
}

export type KaderOpties = {
  breedtePx?: number
  hoogtePx?: number
  /** vermenigvuldigt de span rond de punten vóór de ondergrens (§ opdracht: "met marge") */
  margeFactor?: number
  /** ondergrens op de span in meters — voorkomt dat één referentie (span ≈ 0) een hele stad toont */
  minSpanMeter?: number
  minZoom?: number
  maxZoom?: number
}

const KADER_STANDAARD: Required<KaderOpties> = {
  breedtePx: 320,
  hoogtePx: 168,
  margeFactor: 1.35,
  minSpanMeter: 350,
  minZoom: 12,
  maxZoom: 18,
}

/**
 * Bepaalt kaartkader (zoom + uitsnede) rond een puntenwolk (subject +
 * referenties). Kiest de hoogste zoom (meest ingezoomd) waarbij de
 * gemargde/ondergrensde span nog in de gevraagde pixelafmetingen past —
 * "minimale zoom" uit de opdracht is hier de ondergrens `minZoom` (nooit
 * verder uitzoomen dan dat, ook al zou dat nodig zijn om alle punten te
 * vangen — bij een paar km spreiding kan een uithoekpunt dan net buiten
 * beeld vallen; dat is bewust beter dan een onleesbare hele-stad-kaart).
 */
export function bepaalKaartKader(punten: Punt[], opties: KaderOpties = {}): KaartKader | null {
  if (punten.length === 0) return null
  const o = { ...KADER_STANDAARD, ...opties }

  const merc = punten.map(naarMercator)
  const minX = Math.min(...merc.map(m => m.x))
  const maxX = Math.max(...merc.map(m => m.x))
  const minY = Math.min(...merc.map(m => m.y))
  const maxY = Math.max(...merc.map(m => m.y))
  const middenX = (minX + maxX) / 2
  const middenY = (minY + maxY) / 2

  const spanX = Math.max((maxX - minX) * o.margeFactor, o.minSpanMeter)
  const spanY = Math.max((maxY - minY) * o.margeFactor, o.minSpanMeter)

  let zoom = o.minZoom
  for (let z = o.maxZoom; z >= o.minZoom; z--) {
    const resolutie = resolutieOpZoom(z)
    if (spanX / resolutie <= o.breedtePx && spanY / resolutie <= o.hoogtePx) {
      zoom = z
      break
    }
  }

  const middenGlobaal = mercatorNaarGlobalePixel(middenX, middenY, zoom)
  return {
    zoom,
    linksBovenPx: { px: middenGlobaal.px - o.breedtePx / 2, py: middenGlobaal.py - o.hoogtePx / 2 },
    breedtePx: o.breedtePx,
    hoogtePx: o.hoogtePx,
  }
}

/** Positie (in px, oorsprong linksboven) van een punt binnen het uitgesneden kaartbeeld. */
export function pixelInKader(punt: Punt, kader: KaartKader): { x: number; y: number } {
  const { x, y } = naarMercator(punt)
  const { px, py } = mercatorNaarGlobalePixel(x, y, kader.zoom)
  return { x: px - kader.linksBovenPx.px, y: py - kader.linksBovenPx.py }
}

export type TegelRef = { zoom: number; col: number; row: number }

/** Welke WMTS-tegels (kunnen meer dan 1 zijn) het kader overlappen. */
export function benodigdeTegels(kader: KaartKader): TegelRef[] {
  const maxIndex = 2 ** kader.zoom - 1
  const colVan = Math.max(0, Math.floor(kader.linksBovenPx.px / TEGEL_PX))
  const colTot = Math.min(maxIndex, Math.floor((kader.linksBovenPx.px + kader.breedtePx - 1) / TEGEL_PX))
  const rijVan = Math.max(0, Math.floor(kader.linksBovenPx.py / TEGEL_PX))
  const rijTot = Math.min(maxIndex, Math.floor((kader.linksBovenPx.py + kader.hoogtePx - 1) / TEGEL_PX))

  const tegels: TegelRef[] = []
  for (let row = rijVan; row <= rijTot; row++) {
    for (let col = colVan; col <= colTot; col++) {
      tegels.push({ zoom: kader.zoom, col, row })
    }
  }
  return tegels
}

export function pdokTegelUrl({ zoom, col, row }: TegelRef, stijl: PdokStijl = 'pastel'): string {
  return PDOK_WMTS_TEMPLATE
    .replace('{stijl}', stijl)
    .replace('{z}', String(zoom))
    .replace('{col}', String(col))
    .replace('{row}', String(row))
}

// ── Referenties → kaartpunten ──────────────────────────────────────────────

export type KaartReferentie = { id: string; nummer: number; lat: number; lng: number }

/**
 * Koppelt de referentietabel-volgorde (1-based, zelfde volgorde als de top-6
 * op gewicht in de pdf) aan bekende coördinaten, en laat referenties zonder
 * coördinaat vallen. Uitgesloten referenties staan hier al niet in — die zijn
 * er vóór het berekenen van `uitkomst.referenties` uitgefilterd (zie
 * `lib/waardering.ts` `kiesReferenties`), dus deze functie hoeft daar niets
 * meer voor te doen.
 */
export function kaartReferenties(
  referenties: ReadonlyArray<{ id: string }>,
  coordsById: ReadonlyMap<string, { lat: number; lng: number }>,
): KaartReferentie[] {
  const resultaat: KaartReferentie[] = []
  referenties.forEach((r, i) => {
    const c = coordsById.get(r.id)
    if (c) resultaat.push({ id: r.id, nummer: i + 1, lat: c.lat, lng: c.lng })
  })
  return resultaat
}

// ── Subject-pin contrast ────────────────────────────────────────────────────

const HEX_KLEUR = /^#[0-9A-Fa-f]{6}$/

/**
 * Onder deze relatieve luminantie (WCAG, via `lib/branding.ts` `luminantie()`)
 * is een merkkleur op de pastel-kaart nauwelijks te onderscheiden van de
 * referentiepins (`WaardebepalingPdfTemplate.tsx`, vulling `#14181B`, eigen
 * luminantie ≈ 0,009): beide zijn dan een donkere stip met een witte rand, en
 * bij een (bijna) zwarte merkkleur — zoals het demo-kantoor — valt de subject
 * (dé woning) niet meer op tussen de referenties.
 *
 * 0,06 zit ruim boven die 0,009 (marge voor "donker maar niet zwart") en ruim
 * onder normale merkkleuren: i4housing-blauw `#0080C8` ≈ 0,196 en VestaAI-groen
 * `#1A6B45` ≈ 0,112 blijven dus onaangeraakt, terwijl `#111111` (≈ 0,006) en
 * `#000000` (0) wél worden opgelicht.
 */
export const SUBJECT_PIN_LUMINANTIE_DREMPEL = 0.06

/** Hoeveel `lichter()` een te donkere merkkleur naar wit toe mengt — genoeg om ruim
 * boven de drempel hierboven uit te komen (een grijstint van ~0,2 luminantie bij zwart). */
const SUBJECT_PIN_LICHTER_FACTOR = 0.5

export type SubjectPinStijl = { fill: string; stroke: string; strokeWidth: number }

/**
 * Vul-/randkleur voor de subject-pin (de woning zelf) op de pdf-locatiekaart.
 * Altijd een duidelijke witte rand (halo), dikker dan de rand van de
 * referentiepins (1,6pt in het template) zodat de subject sowieso een eigen silhouet houdt.
 * Is de merkkleur te donker (onder `SUBJECT_PIN_LUMINANTIE_DREMPEL`) dan wordt
 * de vulling met `lichter()` opgelicht i.p.v. de merkkleur zelf te gebruiken —
 * anders verdwijnt de subject-pin bij een (bijna) zwart kantoor tegen de
 * eveneens donkere referentiepins. Een ontbrekende of ongeldige kleur valt
 * veilig terug op VestaAI's eigen merkkleur (nooit een onbepaalde/zwarte pin).
 */
export function subjectPinStijl(merkkleur: string | null | undefined): SubjectPinStijl {
  const veilig = typeof merkkleur === 'string' && HEX_KLEUR.test(merkkleur) ? merkkleur : VESTA_MERK.primair
  const fill = luminantie(veilig) < SUBJECT_PIN_LUMINANTIE_DREMPEL ? lichter(veilig, SUBJECT_PIN_LICHTER_FACTOR) : veilig
  return { fill, stroke: '#FFFFFF', strokeWidth: 2.5 }
}

// ── IO: tegels ophalen + samenstellen (sharp) ──────────────────────────────

export type StatischeKaartAfbeelding = { png: Buffer; breedtePx: number; hoogtePx: number }
export type StatischeKaartResultaat =
  | { ok: true; kaart: StatischeKaartAfbeelding }
  | { ok: false; reden: string }

/**
 * Haalt de WMTS-tegels voor `kader` op (met timeout) en stelt ze samen tot
 * één PNG, uitgesneden op het kader. Geeft altijd een resultaat terug, nooit
 * een throw — bij een netwerk-, timeout- of samenstelfout `{ ok: false }` met
 * een reden zonder adres (de aanroeper logt die, zie route.ts). Nooit de hele
 * pdf laten falen op de kaart.
 */
export async function haalStatischeKaartAfbeelding(
  kader: KaartKader,
  opties: { timeoutMs?: number; stijl?: PdokStijl; fetchImpl?: typeof fetch } = {},
): Promise<StatischeKaartResultaat> {
  const { timeoutMs = 3000, stijl = 'pastel', fetchImpl = fetch } = opties
  const tegels = benodigdeTegels(kader)
  if (tegels.length === 0) return { ok: false, reden: 'geen tegels voor dit kader' }

  const colMin = Math.min(...tegels.map(t => t.col))
  const rowMin = Math.min(...tegels.map(t => t.row))
  const colMax = Math.max(...tegels.map(t => t.col))
  const rowMax = Math.max(...tegels.map(t => t.row))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const buffers = await Promise.all(
      tegels.map(async (t) => {
        const res = await fetchImpl(pdokTegelUrl(t, stijl), { signal: controller.signal })
        if (!res.ok) throw new Error(`tegel ${t.zoom}/${t.col}/${t.row}: HTTP ${res.status}`)
        return { ...t, buffer: Buffer.from(await res.arrayBuffer()) }
      }),
    )

    // sharp is al een dependency (app/api/fotos/staging/route.ts) — dynamic
    // import zodat vitest deze module ook zonder sharp-native-build kan
    // importeren als alleen de pure functies hierboven getest worden.
    const sharp = (await import('sharp')).default

    const canvasBreedte = (colMax - colMin + 1) * TEGEL_PX
    const canvasHoogte = (rowMax - rowMin + 1) * TEGEL_PX
    // Twee stappen, niet één doorlopende keten: sharp/libvips accepteert geen
    // .extract() direct ná .composite() in dezelfde pipeline (gooit ten
    // onrechte "Image to composite must have same dimensions or smaller" bij
    // het materialiseren) — eerst het canvas naar een buffer renderen, dan
    // een nieuwe sharp-instantie daarop voor de uitsnede. Ontdekt tijdens het
    // bouwen van deze functie (28 sep 2026), zie lib/statischeKaart.test.ts.
    const samengesteld = await sharp({
      create: { width: canvasBreedte, height: canvasHoogte, channels: 4, background: { r: 247, g: 244, b: 238, alpha: 1 } },
    })
      .composite(
        buffers.map(({ col, row, buffer }) => ({ input: buffer, left: (col - colMin) * TEGEL_PX, top: (row - rowMin) * TEGEL_PX })),
      )
      .png()
      .toBuffer()

    const links = Math.max(0, Math.round(kader.linksBovenPx.px) - colMin * TEGEL_PX)
    const boven = Math.max(0, Math.round(kader.linksBovenPx.py) - rowMin * TEGEL_PX)
    const png = await sharp(samengesteld)
      .extract({ left: links, top: boven, width: kader.breedtePx, height: kader.hoogtePx })
      .png()
      .toBuffer()

    return { ok: true, kaart: { png, breedtePx: kader.breedtePx, hoogtePx: kader.hoogtePx } }
  } catch (error) {
    const reden = error instanceof Error ? error.name === 'AbortError' ? 'timeout' : error.message : 'onbekende fout'
    return { ok: false, reden }
  } finally {
    clearTimeout(timer)
  }
}
