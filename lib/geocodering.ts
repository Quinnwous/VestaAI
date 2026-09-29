/**
 * Pure geocodeerlogica voor de transactiedataset-pijplijn (item 5.3,
 * docs/roadmap.md § Fase 5). Los van React en Supabase — makkelijk te
 * testen, zie geocodering.test.ts. De PDOK-aanroep zelf (netwerk) leeft in
 * `lib/verrijking.ts` (`pdokZoek`); dit bestand bevat alleen:
 *
 * 1. `bouwPdokQuery()` — een transactierij → een gestructureerde of vrije-
 *    tekst PDOK-zoekvraag (of `null` als er te weinig adresgegevens zijn).
 * 2. `beoordeelTreffer()` — een PDOK-treffer → `exact` / `benaderd` /
 *    `mislukt`, met coördinaat + wijk/buurt.
 *
 * Gebruikt door `scripts/geocodeer-transacties.mjs`.
 */
import { plaatsenGelijk } from './plaatsNormalisatie'

// ── 1. Invoer: de velden van een transactierij die we nodig hebben ─────────

export interface GeocodeerInvoer {
  postcode?: string | null
  huisnummer?: number | string | null
  toevoeging?: string | null
  /** Vrije adrestekst ("Dorpsstraat 12" of "Dorpsstraat 12 A") — terugval voor de straatnaam als die niet los bekend is. */
  adres?: string | null
  plaats?: string | null
}

// ── 2. PDOK-zoekvraag ────────────────────────────────────────────────────

export interface PdokQuery {
  q: string
  fq: string
}

const PDOK_FQ_ADRES = 'type:adres'

function normaliseerPostcode(postcode: string | null | undefined): string | null {
  if (!postcode) return null
  const schoon = postcode.replace(/\s+/g, '').toUpperCase()
  return schoon || null
}

function normaliseerHuisnummer(huisnummer: number | string | null | undefined): number | null {
  if (huisnummer == null || huisnummer === '') return null
  const n = typeof huisnummer === 'number' ? huisnummer : parseInt(huisnummer, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Haalt de straatnaam uit een vrije adrestekst ("Dorpsstraat 12 A" ->
 * "Dorpsstraat"). Bewust een eigen, kleine parser hier (niet
 * `lib/transactieNormalisatie.ts` hergebruiken) — dat bestand hoort bij het
 * importscript (item 5.2) en blijft buiten het bereik van dit item.
 */
function straatUitAdres(adres: string): string | null {
  const zonderPlaats = adres.split(',')[0]?.trim() ?? ''
  if (!zonderPlaats) return null
  const match = zonderPlaats.match(/^(.*\S)\s+\d+/)
  return (match ? match[1] : zonderPlaats).trim() || null
}

/**
 * Bouwt een PDOK Locatieserver-zoekvraag voor één transactierij:
 * - postcode + huisnummer (+ toevoeging) bekend → gestructureerde query
 *   (`postcode:… and huisnummer:…`, evt. `and huisnummertoevoeging:…`);
 * - anders straat (uit `adres`) + huisnummer + plaats bekend → vrije tekst;
 * - anders `null` (te weinig gegevens om zinvol te zoeken).
 */
export function bouwPdokQuery(rij: GeocodeerInvoer): PdokQuery | null {
  const postcode = normaliseerPostcode(rij.postcode)
  const huisnummer = normaliseerHuisnummer(rij.huisnummer)

  // Bewust zonder toevoeging in de query: "12 A" is in de BAG meestal een
  // `huisletter`, geen `huisnummertoevoeging` — met de toevoeging in de query
  // vond PDOK dan niets (0 treffers, live gecontroleerd 28 sep 2026). De
  // juiste variant kiest `kiesBesteTreffer()` uit de treffers.
  if (postcode && huisnummer !== null) {
    return { q: `postcode:${postcode} and huisnummer:${huisnummer}`, fq: PDOK_FQ_ADRES }
  }

  const straat = straatUitAdres(rij.adres ?? '')
  const plaats = rij.plaats?.trim()
  if (straat && huisnummer !== null && plaats) {
    return { q: `${straat} ${huisnummer} ${plaats}`, fq: PDOK_FQ_ADRES }
  }

  return null
}

// ── 3. Treffer beoordelen ───────────────────────────────────────────────

/** De velden die we uit een PDOK-adrestreffer nodig hebben (subset van wat `pdokZoek` teruggeeft). */
export interface PdokDoc {
  centroide_ll?: string // "POINT(lon lat)"
  postcode?: string
  huisnummer?: number | string
  huisletter?: string
  huisnummertoevoeging?: string
  straatnaam?: string
  woonplaatsnaam?: string
  wijknaam?: string
  buurtnaam?: string
}

export interface GeocodeerUitkomst {
  status: 'exact' | 'benaderd' | 'mislukt'
  lat: number | null
  lng: number | null
  wijk: string | null
  buurt: string | null
}

const MISLUKT: GeocodeerUitkomst = { status: 'mislukt', lat: null, lng: null, wijk: null, buurt: null }

function parseCentroide(centroide: string): { lat: number; lng: number } | null {
  const m = centroide.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)
  if (!m) return null
  return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) }
}

function normaliseerDeel(tekst: string | null | undefined): string | null {
  if (!tekst) return null
  const schoon = tekst.trim().toLowerCase()
  return schoon || null
}

/**
 * Beoordeelt een PDOK-treffer tegen de oorspronkelijke rij:
 * - `exact`: postcode én huisnummer komen overeen met de treffer;
 * - `benaderd`: geen (bruikbare) postcode-vergelijking, maar straat + plaats
 *   komen overeen (het huisnummer mag afwijken — dat is precies het
 *   "benaderd"-geval uit de spec, bv. een pand zonder eigen nummeraanduiding);
 * - `mislukt`: geen treffer, geen coördinaat, of geen van beide matcht.
 */
export function beoordeelTreffer(rij: GeocodeerInvoer, pdokDoc: PdokDoc | null): GeocodeerUitkomst {
  if (!pdokDoc?.centroide_ll) return MISLUKT
  const coord = parseCentroide(pdokDoc.centroide_ll)
  if (!coord) return MISLUKT

  const wijk = pdokDoc.wijknaam?.trim() || null
  const buurt = pdokDoc.buurtnaam?.trim() || null

  const postcodeRij = normaliseerPostcode(rij.postcode)
  const postcodeDoc = normaliseerPostcode(pdokDoc.postcode)
  const huisnummerRij = normaliseerHuisnummer(rij.huisnummer)
  const huisnummerDoc = normaliseerHuisnummer(pdokDoc.huisnummer)

  const postcodeMatcht = postcodeRij !== null && postcodeRij === postcodeDoc
  const huisnummerMatcht = huisnummerRij !== null && huisnummerRij === huisnummerDoc

  if (postcodeMatcht && huisnummerMatcht) {
    return { status: 'exact', lat: coord.lat, lng: coord.lng, wijk, buurt }
  }

  const straatRij = normaliseerDeel(straatUitAdres(rij.adres ?? ''))
  const straatDoc = normaliseerDeel(pdokDoc.straatnaam)

  const straatMatcht = straatRij !== null && straatRij === straatDoc
  // plaatsenGelijk (i.p.v. een kale lowercase-vergelijking, item J1): anders
  // wordt "'s-Gravenhage" (PDOK/BAG) vs. "Den Haag" (rij) ten onrechte als
  // mislukt beoordeeld terwijl het dezelfde plaats is.
  const plaatsMatcht = !!rij.plaats && !!pdokDoc.woonplaatsnaam && plaatsenGelijk(rij.plaats, pdokDoc.woonplaatsnaam)

  if (straatMatcht && plaatsMatcht) {
    return { status: 'benaderd', lat: coord.lat, lng: coord.lng, wijk, buurt }
  }

  return MISLUKT
}

function toevoegingVan(doc: PdokDoc): string {
  return `${doc.huisletter ?? ''}${doc.huisnummertoevoeging ?? ''}`.replace(/[\s-]/g, '').toLowerCase()
}

/**
 * Kiest uit de PDOK-treffers (zelfde postcode + huisnummer, verschillende
 * huisletters/toevoegingen) de treffer die bij de toevoeging van de rij past.
 * Zonder toevoeging: het adres zonder letter/toevoeging als dat er is. Past
 * niets, dan de eerste treffer — het huisnummer klopt, de coördinaat ligt dan
 * op hetzelfde pand.
 */
export function kiesBesteTreffer(rij: GeocodeerInvoer, docs: PdokDoc[] | null | undefined): PdokDoc | null {
  if (!docs || docs.length === 0) return null
  const gezocht = (rij.toevoeging ?? '').replace(/[\s-]/g, '').toLowerCase()
  return docs.find(d => toevoegingVan(d) === gezocht) ?? docs[0]
}

/** WKT die PostGIS/PostgREST direct accepteert voor de `geography`-kolom `geo` — zelfde vorm als `lib/transactieImport.ts`. */
export function naarGeoWkt(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`
}
