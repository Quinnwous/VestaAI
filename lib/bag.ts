/**
 * BAG Individuele Bevragingen v2 (Kadaster) — URL's en parsers voor
 * `app/api/bag/route.ts` (voorvullen intake) en `app/api/bag/suggest/route.ts`
 * (adres-autocomplete).
 *
 * Les 27 sep 2026: beide routes vroegen `/adressen?zoekresultaat=…` op. Die
 * parameter bestaat niet (400 "Ten minste één parameter moet worden
 * opgegeven"), `pageSize` moet ≥ 10 zijn, `/verblijfsobjecten/{id}` vraagt een
 * `Accept-Crs`-header, en het bouwjaar staat op het pand, niet op het
 * verblijfsobject. De routes vouwden elke fout stil op tot "leeg", dus de
 * autocomplete en het voorvullen deden ongemerkt niets. Vrije tekst zoeken gaat
 * via `q`; bouwjaar + oppervlakte in één call via `adressenuitgebreid`.
 */

export const BAG_BASE = 'https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2'

/** Minimum dat de API accepteert; kleiner geeft 400. */
const BAG_MIN_PAGE_SIZE = 10

export function bagHeaders(apiKey: string): Record<string, string> {
  return { 'X-Api-Key': apiKey, Accept: 'application/hal+json', 'Accept-Crs': 'epsg:28992' }
}

export function bagZoekUrl(q: string): string {
  const params = new URLSearchParams({ q, page: '1', pageSize: String(BAG_MIN_PAGE_SIZE) })
  return `${BAG_BASE}/adressen?${params}`
}

export function bagUitgebreidUrl(nummeraanduidingId: string): string {
  return `${BAG_BASE}/adressenuitgebreid/${encodeURIComponent(nummeraanduidingId)}`
}

export interface BagSuggestie {
  label: string
  adresseerbaarobject_id: string | null
  nummeraanduiding_id: string | null
}

export type BagAdres = {
  openbareRuimteNaam?: string
  huisnummer?: number
  huisletter?: string | null
  huisnummertoevoeging?: string | null
  postcode?: string | null
  woonplaatsNaam?: string
  nummeraanduidingIdentificatie?: string
  adresseerbaarObjectIdentificatie?: string
}

export function bagAdressen(data: unknown): BagAdres[] {
  const lijst = (data as { _embedded?: { adressen?: unknown } } | null)?._embedded?.adressen
  return Array.isArray(lijst) ? (lijst as BagAdres[]) : []
}

export function bagLabel(a: BagAdres): string {
  const nummer = `${a.huisnummer ?? ''}${a.huisletter ?? ''}${a.huisnummertoevoeging ? `-${a.huisnummertoevoeging}` : ''}`
  return [`${a.openbareRuimteNaam ?? ''} ${nummer}`.trim(), a.postcode, a.woonplaatsNaam]
    .filter(Boolean)
    .join(', ')
}

export function naarSuggestie(a: BagAdres): BagSuggestie {
  return {
    label: bagLabel(a),
    adresseerbaarobject_id: a.adresseerbaarObjectIdentificatie ?? null,
    nummeraanduiding_id: a.nummeraanduidingIdentificatie ?? null,
  }
}

/** Bouwjaar en oppervlakte uit een `adressenuitgebreid`-antwoord. Bouwjaar is een lijst strings (één per pand). */
export function parseUitgebreid(data: unknown): { bouwjaar: number | null; oppervlak_m2: number | null } {
  const d = (data ?? {}) as { oorspronkelijkBouwjaar?: unknown; oppervlakte?: unknown }
  const jaren = (Array.isArray(d.oorspronkelijkBouwjaar) ? d.oorspronkelijkBouwjaar : [d.oorspronkelijkBouwjaar])
    .map(j => Number(j))
    .filter(j => Number.isInteger(j) && j > 1000 && j < 2100)
  const opp = Number(d.oppervlakte)
  return {
    bouwjaar: jaren.length ? Math.min(...jaren) : null,
    oppervlak_m2: Number.isFinite(opp) && opp > 0 ? opp : null,
  }
}
