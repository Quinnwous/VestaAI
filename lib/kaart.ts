/**
 * Pure kaartfuncties voor de MapLibre-stack (item 7.1, § 3.5/3.8 van
 * docs/roadmap.md) — geen React, geen DOM, makkelijk te testen met vitest
 * (zie lib/kaart.test.ts). Verantwoordelijk voor: de pastel PDOK-stijl, en de
 * geometrie/aggregatie die `components/kaart/*` nodig heeft (cirkel voor de
 * straal-uitsnede, bounds om op de eigen verkopen te centreren, GeoJSON-
 * opbouw en grid-clustering boven 200 zichtbare pins).
 */
import type { StyleSpecification } from 'maplibre-gl'

/** BRT-Achtergrondkaart vectortiles + glyphs (PDOK, gratis, geen sleutel — CC BY 4.0). */
export const PDOK_TILES_URL =
  'https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1/tiles/WebMercatorQuad/{z}/{y}/{x}?f=mvt'
export const PDOK_GLYPHS_URL =
  'https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1/resources/fonts/{fontstack}/{range}.pbf'
export const PDOK_ATTRIBUTIE =
  'Kaartgegevens: <a href="https://www.pdok.nl/" target="_blank" rel="noopener">PDOK</a> / Kadaster (BRT)'

/**
 * Eigen pastelstijl (besluit 17 sep 2026: iets meer kleur dan grijstinten,
 * rustig, Apple-achtig zacht) op de PDOK-vectortiles. PDOK levert zelf geen
 * "pastel"-stijl — dit is de officiële `standaard`-stijl (bron-/laagnamen 1
 * op 1 overgenomen van
 * .../ogc/v1/styles/standaard__webmercatorquad?f=mapbox) met een eigen,
 * zachtere kleurenset. Bewust een subset van de officiële laag: geen
 * tunnels/metro/kabelbaan-details, die voegen op deze schaal niets toe en
 * PDOK kan de source-layers uitbreiden zonder dat dit breekt.
 */
export function pdokPastelStijl(): StyleSpecification {
  return {
    version: 8,
    name: 'i4-pastel',
    glyphs: PDOK_GLYPHS_URL,
    sources: {
      brt: {
        type: 'vector',
        tiles: [PDOK_TILES_URL],
        minzoom: 0,
        maxzoom: 17,
        attribution: PDOK_ATTRIBUTIE,
      },
    },
    layers: [
      { id: 'achtergrond', type: 'background', paint: { 'background-color': '#F7F4EE' } },
      {
        id: 'onderlegger-nl',
        type: 'fill',
        source: 'brt',
        'source-layer': 'nederland',
        paint: {
          'fill-color': ['match', ['get', 'vistext'], '(zee)water', '#C7E3ED', '#F7F4EE'],
        },
      },
      {
        id: 'bodemgebruik',
        type: 'fill',
        source: 'brt',
        'source-layer': 'terreinvlak',
        paint: {
          'fill-color': [
            'match',
            ['get', 'vistext'],
            'bos', '#D6E6C9',
            'bos: dras, moeras, riet', '#D6E6C9',
            'heide', '#EAD9E6',
            'heide: dras, moeras, riet', '#EAD9E6',
            'zand', '#F6EFD2',
            'zand: dras, moeras, riet', '#F6EFD2',
            'bebouwd gebied', '#EFEAF1',
            'zee', '#C7E3ED',
            'meer, plas', '#C7E3ED',
            'transparent',
          ],
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'brt',
        'source-layer': 'waterdeelvlak',
        paint: {
          'fill-color': [
            'match',
            ['get', 'vistext'],
            'zee', '#C7E3ED',
            'meer, plas', '#C7E3ED',
            'droogvallend', '#D6EAF2',
            'waterloop', '#C7E3ED',
            'transparent',
          ],
        },
      },
      {
        id: 'wegen-vlak',
        type: 'fill',
        source: 'brt',
        'source-layer': 'wegdeelvlak',
        paint: {
          'fill-color': [
            'match',
            ['get', 'vistext'],
            'autosnelweg', '#F5CE8F',
            'autosnelweg op brug', '#F5CE8F',
            'hoofdweg', '#F7E7B3',
            'hoofdweg op brug', '#F7E7B3',
            'straat', '#FFFFFF',
            'straat op brug', '#FFFFFF',
            'fietspad', '#EDE7E2',
            '#F1ECE7',
          ],
        },
      },
      {
        id: 'gebouw',
        type: 'fill',
        source: 'brt',
        'source-layer': 'gebouwvlak',
        paint: { 'fill-color': '#E3DEDA', 'fill-outline-color': '#D2CBC4' },
      },
      {
        id: 'spoor',
        type: 'line',
        source: 'brt',
        'source-layer': 'spoorbaandeellijn',
        paint: { 'line-color': '#B9B2AC', 'line-width': 1.2 },
      },
      {
        id: 'water-label',
        type: 'symbol',
        source: 'brt',
        'source-layer': 'waterdeelvlak_label',
        layout: { 'text-field': ['get', 'naam'], 'text-font': ['Liberation Sans Italic'], 'text-size': 11 },
        paint: { 'text-color': '#6C9BB0' },
      },
      {
        id: 'straatnamen',
        type: 'symbol',
        source: 'brt',
        'source-layer': 'straatnamen',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Liberation Sans Regular'],
          'text-size': 11,
          'symbol-placement': 'line',
        },
        paint: { 'text-color': '#8A8378' },
      },
    ],
  }
}

export type Coord = readonly [number, number]

/**
 * Cirkelpolygoon (GeoJSON, lng/lat) rond een middelpunt — gebruikt door
 * `StraalLaag` voor de straal-uitsnede (250/1000 m). Vlakke aarde-benadering
 * (graden per meter varieert alleen met breedtegraad): ruim nauwkeurig
 * genoeg op de schaal van een straal-uitsnede (max enkele km).
 */
export function cirkelPolygoon(
  middelpunt: Coord,
  straalM: number,
  segmenten = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = middelpunt
  const gradenPerMeterLat = 1 / 110_574
  const gradenPerMeterLng = 1 / (111_320 * Math.cos((lat * Math.PI) / 180) || 1)
  const ring: Coord[] = []
  for (let i = 0; i <= segmenten; i++) {
    const hoek = (i / segmenten) * 2 * Math.PI
    ring.push([
      lng + straalM * Math.cos(hoek) * gradenPerMeterLng,
      lat + straalM * Math.sin(hoek) * gradenPerMeterLat,
    ])
  }
  return {
    type: 'Feature',
    properties: { straalM },
    geometry: { type: 'Polygon', coordinates: [ring as unknown as number[][]] },
  }
}

export type PuntMetCoord = { lat: number; lng: number }

/**
 * Bounds ([[minLng,minLat],[maxLng,maxLat]]) om `map.fitBounds()` op de
 * eigen verkopen te centreren. `null` bij een lege lijst — de aanroeper valt
 * dan terug op een vast middelpunt.
 */
export function boundsUitPunten(punten: PuntMetCoord[]): [Coord, Coord] | null {
  if (punten.length === 0) return null
  let minLat = punten[0].lat
  let maxLat = punten[0].lat
  let minLng = punten[0].lng
  let maxLng = punten[0].lng
  for (const p of punten) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

export type VerkoopFeatureProperties = {
  id: string
  adres: string
  prijs: number | null
  datum: string | null
  m2: number | null
}

export type VerkoopInvoer = {
  id: string
  lat: number | null
  lng: number | null
  adres: string
  verkoopprijs: number | null
  verkoopdatum: string | null
  woonoppervlak_m2: number | null
}

/**
 * Eigen verkopen → GeoJSON `FeatureCollection<Point>` (lng/lat-volgorde,
 * GeoJSON-conventie) voor `VerkopenLaag`. Transacties zonder coördinaten
 * worden overgeslagen — die kunnen sowieso niet op de kaart.
 */
export function verkopenNaarGeoJSON(
  transacties: VerkoopInvoer[],
): GeoJSON.FeatureCollection<GeoJSON.Point, VerkoopFeatureProperties> {
  const features: GeoJSON.Feature<GeoJSON.Point, VerkoopFeatureProperties>[] = []
  for (const t of transacties) {
    if (t.lat === null || t.lng === null) continue
    features.push({
      type: 'Feature',
      properties: {
        id: t.id,
        adres: t.adres,
        prijs: t.verkoopprijs,
        datum: t.verkoopdatum,
        m2: t.woonoppervlak_m2,
      },
      geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
    })
  }
  return { type: 'FeatureCollection', features }
}

export type ClusterPunt = { id: string; lat: number; lng: number }
export type Cluster = { lat: number; lng: number; aantal: number; ids: string[] }

/**
 * Grid-clustering (§ 3.8/README § 6: "clustering boven 200 zichtbare
 * pins" — puur voor leesbaarheid, geen library nodig op deze schaal).
 * `celGraden` bepaalt de rastercel; punten in dezelfde cel worden één
 * cluster op hun gemiddelde positie. Deterministisch or van invoervolgorde,
 * dus stabiel te testen.
 */
export function clusterPunten(punten: ClusterPunt[], celGraden: number): Cluster[] {
  if (celGraden <= 0) throw new Error('celGraden moet positief zijn')
  const cellen = new Map<string, { latSom: number; lngSom: number; ids: string[] }>()
  // + 1e-9 voorkomt dat een punt vlak op een celgrens door drijvendekomma-
  // afronding (bv. 52.1 / 0.05) net in de verkeerde cel valt.
  const celIndex = (waarde: number) => Math.floor(waarde / celGraden + 1e-9)
  for (const p of punten) {
    const sleutel = `${celIndex(p.lat)}:${celIndex(p.lng)}`
    const cel = cellen.get(sleutel)
    if (cel) {
      cel.latSom += p.lat
      cel.lngSom += p.lng
      cel.ids.push(p.id)
    } else {
      cellen.set(sleutel, { latSom: p.lat, lngSom: p.lng, ids: [p.id] })
    }
  }
  return Array.from(cellen.values()).map((c) => ({
    lat: c.latSom / c.ids.length,
    lng: c.lngSom / c.ids.length,
    aantal: c.ids.length,
    ids: c.ids,
  }))
}

/**
 * Rastercelgrootte (in graden) voor `clusterPunten`, afhankelijk van de
 * zoom — hoe verder ingezoomd, hoe kleiner de cel (pins vallen dan sneller
 * weer uit elkaar). Vuistregel, geen exacte projectie nodig: bij deze
 * dataset-schaal (eigen verkopen van één kantoor) hoeft dit niet
 * pixel-precies te matchen met de MapLibre-viewport.
 */
export function celGradenVoorZoom(zoom: number): number {
  return 4 / 2 ** zoom
}
