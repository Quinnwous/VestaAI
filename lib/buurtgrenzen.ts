/**
 * Buurtgrenzen (backlog roadmap § 9) — pure logica voor de schakelbare laag
 * "Buurtgrenzen" op de verkoopkaart (`components/kaart/BuurtgrenzenLaag.tsx`,
 * proxy-route `app/api/kaart/buurtgrenzen/route.ts`). Geen React, geen fetch
 * hier — alleen bbox-opbouw/validatie en het terugbrengen van de PDOK-respons
 * tot de velden die de kaart nodig heeft.
 *
 * Databron: CBS Wijken en Buurten 2024 via PDOK OGC API Features — gratis,
 * geen sleutel, CC BY 4.0. Endpoint getest met curl op 28 sep 2026:
 *   https://api.pdok.nl/cbs/wijken-en-buurten-2024/ogc/v1/collections/buurten/items
 * Levert per buurt 250+ CBS-statistiekkolommen (inwoners, inkomen,
 * voorzieningen...) die we hier niet nodig hebben — 5 buurten ongefilterd is
 * al ~265 kB. `naarBuurtenGeoJSON` behoudt alleen naam/code, wat een
 * viewport-call teruggbrengt tot een fractie daarvan.
 */

/** [west, south, east, north] — CRS84 (lng/lat), zoals PDOK's `bbox`-parameter en GeoJSON verwachten. */
export type Bbox = readonly [number, number, number, number]

export const PDOK_BUURTEN_ITEMS_URL =
  'https://api.pdok.nl/cbs/wijken-en-buurten-2024/ogc/v1/collections/buurten/items'

export type BuurtProperties = {
  buurtcode: string
  buurtnaam: string
  wijkcode: string
  gemeentenaam: string
}

export type BuurtenGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, BuurtProperties>

/**
 * Boven deze breedte/hoogte (graden) fetchen we niet — dat zou heel Nederland
 * (duizenden buurten, tientallen MB's geometrie) in één call opvragen terwijl
 * de opdracht expliciet "alleen het zichtbare kaartgebied" vraagt. ~0,6° is
 * ruim genoeg voor een hele gemeente of regio op de verkoopkaart; verder
 * uitgezoomd toont de schakelaar een "zoom in"-hint i.p.v. te fetchen.
 */
export const MAX_BBOX_BREEDTE_GRADEN = 0.6
export const MAX_BBOX_HOOGTE_GRADEN = 0.6

export function bboxTeGroot([west, south, east, north]: Bbox): boolean {
  return east - west > MAX_BBOX_BREEDTE_GRADEN || north - south > MAX_BBOX_HOOGTE_GRADEN
}

/** `"4.3,52.1,4.5,52.2"` → `[4.3, 52.1, 4.5, 52.2]`, of `null` bij een onbruikbare/ontbrekende param. */
export function parseBboxParam(param: string | null): Bbox | null {
  if (!param) return null
  const delen = param.split(',').map(Number)
  if (delen.length !== 4 || delen.some((n) => !Number.isFinite(n))) return null
  const [west, south, east, north] = delen
  if (west >= east || south >= north) return null
  return [west, south, east, north]
}

/** Aantal buurten per call plafonneren — bij een geldige (niet-te-grote) bbox ruim voldoende, en een vangnet als PDOK ooit meer teruggeeft dan verwacht. */
const LIMIT = 250

export function buurtenItemsUrl(bbox: Bbox): string {
  const [west, south, east, north] = bbox
  const params = new URLSearchParams({
    f: 'json',
    bbox: [west, south, east, north].map((n) => n.toFixed(6)).join(','),
    limit: String(LIMIT),
  })
  return `${PDOK_BUURTEN_ITEMS_URL}?${params.toString()}`
}

/** Zoom vanaf waar buurtnaam-labels leesbaar/zinnig zijn — te veel labels bij uitgezoomd maakt de kaart onleesbaar. */
export const BUURT_LABEL_MINZOOM = 12

/**
 * PDOK-respons (ongevalideerd, extern) → GeoJSON met alleen de velden die de
 * kaart nodig heeft. `null` bij een onherkenbare vorm (de aanroeper/route
 * behandelt dat als 'mislukt'); een lege maar geldige `features`-array levert
 * een lege FeatureCollection op (de route behandelt dát als 'leeg' — beide
 * mogen nooit hetzelfde pad volgen, zie CLAUDE.md-les over stille
 * terugvallen).
 */
export function naarBuurtenGeoJSON(pdokRespons: unknown): BuurtenGeoJSON | null {
  if (!pdokRespons || typeof pdokRespons !== 'object') return null
  const features = (pdokRespons as { features?: unknown }).features
  if (!Array.isArray(features)) return null

  const uit: BuurtenGeoJSON['features'] = []
  for (const f of features) {
    if (!f || typeof f !== 'object') continue
    const geometry = (f as { geometry?: unknown }).geometry as GeoJSON.Geometry | undefined
    const props = (f as { properties?: Record<string, unknown> }).properties
    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) continue
    if (!props || typeof props.buurtcode !== 'string' || typeof props.buurtnaam !== 'string') continue
    uit.push({
      type: 'Feature',
      geometry,
      properties: {
        buurtcode: props.buurtcode,
        buurtnaam: props.buurtnaam,
        wijkcode: typeof props.wijkcode === 'string' ? props.wijkcode : '',
        gemeentenaam: typeof props.gemeentenaam === 'string' ? props.gemeentenaam : '',
      },
    })
  }
  return { type: 'FeatureCollection', features: uit }
}

/** HTTP-status van PDOK → 'leeg' (4xx, de bron bestaat maar deze bbox/param niet) of 'mislukt' (5xx/429, retry kan wél iets opleveren) — zelfde onderscheid als `lib/verrijking.ts` `fetchMetStatus`. */
export function statusVoorHttpFout(httpStatus: number): 'leeg' | 'mislukt' {
  return httpStatus >= 500 || httpStatus === 429 ? 'mislukt' : 'leeg'
}
