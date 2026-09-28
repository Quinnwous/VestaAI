/**
 * Presentatiemodus ("keukentafel", docs/roadmap.md § Stand van zaken —
 * "Volgende ronde" item 1): de makelaar laat de waardebepaling rustig en
 * groot zien aan de verkoper, zonder de werkomgeving (filters, correctie-
 * schakelaars, jargon-tabellen) eromheen. Puur, los van React/Next, zodat
 * "welke stappen tonen we" en "wat is de top-6" met vitest te testen zijn
 * vóórdat er UI op komt (`components/presentatie/WaardePresentatie.tsx` en
 * `app/(app)/object/[id]/presentatie/page.tsx` importeren dit).
 */
import type { WaarderingReferentie } from './schemas'

/**
 * Zelfde top-6-op-gewicht als de referentietabel in
 * `WaardebepalingPdfTemplate.tsx` (en de lokale `top6VanUitkomst` in
 * `app/api/pdf/waardebepaling/route.ts`) — de presentatie mag geen ander
 * verhaal vertellen dan de pdf en het scherm: zelfde volgorde, zelfde
 * nummering op de kaart.
 */
export function top6Referenties(referenties: WaarderingReferentie[]): WaarderingReferentie[] {
  return [...referenties].sort((a, b) => b.gewicht - a.gewicht).slice(0, 6)
}

export type PresentatieStapId = 'woning' | 'waarde' | 'kaart' | 'referenties' | 'woz' | 'toelichting'

/** Vaste volgorde + label per stap — ook gebruikt voor de stippen-voortgang. */
export const PRESENTATIE_STAPPEN_VOLGORDE: PresentatieStapId[] = ['woning', 'waarde', 'kaart', 'referenties', 'woz', 'toelichting']

export const PRESENTATIE_STAP_LABEL: Record<PresentatieStapId, string> = {
  woning: 'De woning',
  waarde: 'De waarde',
  kaart: 'Vergelijkbare verkopen',
  referenties: 'Referenties',
  woz: 'WOZ-waarde',
  toelichting: 'Toelichting',
}

export interface PresentatieContext {
  /** Heeft dit dossier een coördinaat (`objecten.lat`/`lng`)? Zonder coördinaat is er geen kaart om te tonen. */
  heeftGeo: boolean
  /** Aantal referenties dat de kaart/tabel toont — geef `top6Referenties(uitkomst.referenties).length` door. */
  aantalReferenties: number
  /** WOZ-ijkpunt uit de intake (`lib/woz.ts` `wozUitInvoer`) — alleen tonen als de makelaar dit zelf heeft ingevuld. */
  heeftWoz: boolean
}

/**
 * Bepaalt welke stappen de presentatie toont, gegeven de data van dít
 * dossier — nooit een lege of kapotte stap. "De woning" en "de waarde" staan
 * er altijd (ook bij weinig of geen referenties: de waardestap toont dan de
 * bestaande lage-data-waarschuwing uit `lib/waardering.ts`, geen aparte
 * stap-logica hier). De kaart alleen met een coördinaat, de referentietabel
 * alleen als er iets in te staan, WOZ alleen bij een ingevulde waarde
 * (besluit 24 sep 2026: handmatige invoer, geen API). De toelichting sluit
 * altijd af — makelaarscorrectie + motivatie als die er is, anders alleen de
 * kantoorafsluiting (naam/logo/contact).
 */
export function bepaalPresentatieStappen({ heeftGeo, aantalReferenties, heeftWoz }: PresentatieContext): PresentatieStapId[] {
  const stappen: PresentatieStapId[] = ['woning', 'waarde']
  if (heeftGeo) stappen.push('kaart')
  if (aantalReferenties > 0) stappen.push('referenties')
  if (heeftWoz) stappen.push('woz')
  stappen.push('toelichting')
  return stappen
}

/** "Gebaseerd op 6 vergelijkbare verkopen" (enkelvoud/lege variant inbegrepen) — onderschrift bij de waardestap. */
export function referentiesOnderschrift(n: number): string {
  if (n <= 0) return 'Nog geen vergelijkbare verkopen gevonden'
  if (n === 1) return 'Gebaseerd op 1 vergelijkbare verkoop'
  return `Gebaseerd op ${n} vergelijkbare verkopen`
}

/**
 * Kaartkader (MapLibre `bounds`: `[[west,zuid],[oost,noord]]` in lng/lat) voor
 * de live presentatiekaart — subject + referenties, met marge en een
 * ondergrens zodat één enkel punt niet een straat-nauw kader oplevert.
 * Bewust een eigen, simpele lat/lng-bounding-box i.p.v. de Mercator-
 * pixelwiskunde van `lib/statischeKaart.ts` (die is voor de samengestelde
 * pdf-afbeelding, dit is voor een interactieve MapLibre-`fitBounds`).
 */
export function presentatieKaartBounds(
  subject: { lat: number; lng: number },
  referenties: { lat: number; lng: number }[],
  margeFactor = 1.5,
  minSpanGraden = 0.006,
): [[number, number], [number, number]] {
  const punten = [subject, ...referenties]
  const lats = punten.map((p) => p.lat)
  const lngs = punten.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const midLat = (minLat + maxLat) / 2
  const midLng = (minLng + maxLng) / 2
  const spanLat = Math.max((maxLat - minLat) * margeFactor, minSpanGraden)
  const spanLng = Math.max((maxLng - minLng) * margeFactor, minSpanGraden)
  return [
    [midLng - spanLng / 2, midLat - spanLat / 2],
    [midLng + spanLng / 2, midLat + spanLat / 2],
  ]
}

/**
 * Welke waarschuwingen de verkoper te zien krijgt. Alleen de eerlijke
 * "weinig data"-meldingen uit `lib/waardering.ts` (te weinig vergelijkbare
 * verkopen, geen locatie) — die gaan over de betrouwbaarheid van het getal
 * zelf. Rekennotities over de prijsindex ("index 2023-Q3 niet betrouwbaar,
 * 2023-Q4 gebruikt") zijn voor de makelaar en blijven in het paneel en de pdf.
 */
const VERKOPER_WAARSCHUWING = /^(Ook binnen|Minder dan|Zonder locatie)/

export function verkoperWaarschuwingen(waarschuwingen: string[]): string[] {
  return waarschuwingen.filter(w => VERKOPER_WAARSCHUWING.test(w))
}
