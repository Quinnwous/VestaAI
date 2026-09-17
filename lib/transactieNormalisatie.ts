/**
 * Pure normalisatiefuncties voor de transactiedataset-pijplijn (item 2.1, zie
 * docs/roadmap.md § Fase 2 en docs/ontwerp/README.md § 5). Los van React en
 * Supabase — makkelijk te testen, zie transactieNormalisatie.test.ts.
 *
 * Twee taken:
 * 1. `adresSleutel()` — genormaliseerde natuurlijke sleutel voor ontdubbelen
 *    bij herimport (vervangt de losse `adres`-kolom als upsert-sleutel).
 * 2. `woningtypeGroep()` / `woningtypeSub()` — mapt vrije bron-waarden
 *    (Brainbay/Realworks-achtige labels, of de bestaande intake-enum uit
 *    `PropertyInputSchema.woningtype` in lib/schemas.ts) naar de vaste
 *    taxonomie uit docs/ontwerp/README.md § 5 (= docs/ontwerp/kit.js
 *    `TAXONOMIE`). Onbekend -> null, nooit gokken — de waarderingskern
 *    (lib/waardering.ts) filtert kandidaten hard op `woningtype_groep`, dus
 *    een verkeerde gok zou een woning in de verkeerde vergelijkingsgroep
 *    trekken.
 */

import type { Typegroep } from './schemas'

// ── 1. Adres-sleutel ────────────────────────────────────────────────────────

export type AdresSleutelInvoer = {
  postcode?: string | null
  huisnummer?: number | string | null
  toevoeging?: string | null
  straat?: string | null
  plaats?: string | null
  /** Vrije adrestekst ("Dorpsstraat 12 A") — bron voor huisnummer/toevoeging/straat als die niet los zijn aangeleverd. */
  adres?: string | null
}

export type AdresOnderdelen = {
  straat: string | null
  huisnummer: number | null
  toevoeging: string | null
}

function normaliseerPostcode(postcode: string | null | undefined): string | null {
  if (!postcode) return null
  const schoon = postcode.replace(/\s+/g, '').toLowerCase()
  return schoon || null
}

function normaliseerToevoeging(toevoeging: string | null | undefined): string | null {
  if (toevoeging == null) return null
  const schoon = toevoeging.trim().toLowerCase()
  return schoon || null
}

function normaliseerHuisnummer(huisnummer: number | string | null | undefined): number | null {
  if (huisnummer == null || huisnummer === '') return null
  const n = typeof huisnummer === 'number' ? huisnummer : parseInt(huisnummer, 10)
  return Number.isFinite(n) ? n : null
}

/** Voor het straat/plaats-deel van de terugvalsleutel: lowercase, enkele spaties. */
function normaliseerDeel(tekst: string): string {
  return tekst.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Splitst een vrije adrestekst ("Dorpsstraat 12", "Dorpsstraat 12 A",
 * "Dorpsstraat 12-bis", "Dorpsstraat 12a") in straat/huisnummer/toevoeging.
 * Een eventuele plaatsnaam na een komma ("Dorpsstraat 12, Wassenaar") wordt
 * genegeerd — die komt uit het aparte `plaats`-veld.
 */
export function parseAdresVrijeTekst(adres: string): AdresOnderdelen {
  const zonderPlaats = adres.split(',')[0]?.trim() ?? ''
  if (!zonderPlaats) return { straat: null, huisnummer: null, toevoeging: null }

  const match = zonderPlaats.match(/^(.*\S)\s+(\d+)\s*[-\s]?\s*([A-Za-z0-9]*)\s*$/)
  if (!match) return { straat: zonderPlaats, huisnummer: null, toevoeging: null }

  const [, straat, nummer, toevoeging] = match
  return {
    straat: straat.trim() || null,
    huisnummer: normaliseerHuisnummer(nummer),
    toevoeging: toevoeging ? toevoeging.toLowerCase() : null,
  }
}

/**
 * Genormaliseerde natuurlijke sleutel voor een transactierij, gebruikt in de
 * unieke index `(kantoor_id, adres_sleutel, verkoopdatum)` zodat een
 * herhaalde import dezelfde woning herkent ongeacht kleine verschillen in
 * schrijfwijze. Voorkeursvorm `postcode|huisnummer|toevoeging`; zonder
 * bruikbare postcode valt hij terug op `straat|huisnummer|plaats`. Ontbreken
 * ook die velden (geen huisnummer te achterhalen, zelfs niet uit een vrije
 * `adres`-tekst), dan is er geen betrouwbare sleutel te maken -> `null`, de
 * rij hoort dan NIET geïmporteerd te worden (zie app/admin/transacties/actions.ts).
 */
export function adresSleutel(invoer: AdresSleutelInvoer): string | null {
  let huisnummer = normaliseerHuisnummer(invoer.huisnummer)
  let toevoeging = normaliseerToevoeging(invoer.toevoeging)
  let straat = invoer.straat?.trim() || null

  if (huisnummer === null && invoer.adres) {
    const onderdelen = parseAdresVrijeTekst(invoer.adres)
    if (huisnummer === null) huisnummer = onderdelen.huisnummer
    if (toevoeging === null) toevoeging = onderdelen.toevoeging
    if (straat === null) straat = onderdelen.straat
  }

  const postcode = normaliseerPostcode(invoer.postcode)
  if (postcode && huisnummer !== null) {
    return `${postcode}|${huisnummer}|${toevoeging ?? ''}`
  }

  if (straat && huisnummer !== null && invoer.plaats) {
    return `${normaliseerDeel(straat)}|${huisnummer}|${normaliseerDeel(invoer.plaats)}`
  }

  return null
}

// ── 2. Woningtype-taxonomie ─────────────────────────────────────────────────
// Groepen + subtypes exact zoals docs/ontwerp/README.md § 5 / docs/ontwerp/kit.js
// TAXONOMIE. Elke entry mapt een of meer ruwe bron-waarden (Brainbay/Realworks-
// achtige labels, of de bestaande PropertyInputSchema.woningtype-enum uit
// lib/schemas.ts) op een vaste { groep, sub }. `sub: null` = de groep is wel
// duidelijk maar het exacte subtype niet (bv. een generieke "Appartement" of
// "Eengezinswoning") — beter géén subtype dan een gegokt subtype.

type TaxonomieEntry = { ruw: string[]; groep: Typegroep; sub: string | null }

const MAPPING: TaxonomieEntry[] = [
  // appartement
  { ruw: ['appartement', 'flat'], groep: 'appartement', sub: null },
  { ruw: ['bovenwoning'], groep: 'appartement', sub: 'Bovenwoning' },
  { ruw: ['benedenwoning'], groep: 'appartement', sub: 'Benedenwoning' },
  { ruw: ['maisonnette'], groep: 'appartement', sub: 'Maisonnette' },
  { ruw: ['portiekflat'], groep: 'appartement', sub: 'Portiekflat' },
  { ruw: ['galerijflat'], groep: 'appartement', sub: 'Galerijflat' },
  { ruw: ['penthouse'], groep: 'appartement', sub: 'Penthouse' },
  { ruw: ['studio'], groep: 'appartement', sub: 'Studio' },
  // rijwoning ("Eengezinswoning")
  { ruw: ['tussenwoning'], groep: 'rijwoning', sub: 'Tussenwoning' },
  { ruw: ['hoekwoning'], groep: 'rijwoning', sub: 'Hoekwoning' },
  { ruw: ['eindwoning'], groep: 'rijwoning', sub: 'Eindwoning' },
  { ruw: ['geschakelde woning'], groep: 'rijwoning', sub: 'Geschakelde woning' },
  { ruw: ['herenhuis'], groep: 'rijwoning', sub: 'Herenhuis' },
  { ruw: ['drive in woning', 'drive in'], groep: 'rijwoning', sub: 'Drive-in woning' },
  { ruw: ['eengezinswoning', 'rijwoning', 'rijtjeswoning'], groep: 'rijwoning', sub: null },
  // halfvrijstaand
  {
    ruw: ['twee onder een kap', 'twee onder een kapwoning', '2 onder 1 kapwoning', '2 onder 1 kap'],
    groep: 'halfvrijstaand',
    sub: 'Twee-onder-een-kap',
  },
  {
    ruw: ['geschakelde twee onder een kap', 'geschakelde 2 onder 1 kapwoning', 'geschakelde 2 onder 1 kap'],
    groep: 'halfvrijstaand',
    sub: 'Geschakelde twee-onder-een-kap',
  },
  { ruw: ['halfvrijstaande woning', 'halfvrijstaand'], groep: 'halfvrijstaand', sub: null },
  // vrijstaand
  { ruw: ['vrijstaande woning', 'vrijstaand'], groep: 'vrijstaand', sub: 'Vrijstaande woning' },
  { ruw: ['villa'], groep: 'vrijstaand', sub: 'Villa' },
  { ruw: ['landhuis'], groep: 'vrijstaand', sub: 'Landhuis' },
  { ruw: ['bungalow'], groep: 'vrijstaand', sub: 'Bungalow' },
  { ruw: ['woonboerderij'], groep: 'vrijstaand', sub: 'Woonboerderij' },
]

function normaliseerRuw(waarde: string): string {
  return waarde
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // diakrieten weg (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const OPZOEKTABEL: Map<string, TaxonomieEntry> = new Map(
  MAPPING.flatMap(entry => entry.ruw.map(ruw => [normaliseerRuw(ruw), entry] as const)),
)

function zoekMapping(ruweWaarde: string | null | undefined): TaxonomieEntry | null {
  if (!ruweWaarde || !ruweWaarde.trim()) return null
  return OPZOEKTABEL.get(normaliseerRuw(ruweWaarde)) ?? null
}

/** Groep uit de taxonomie (§ 3.3), of `null` als de ruwe waarde onbekend is — nooit gokken. */
export function woningtypeGroep(ruweWaarde: string | null | undefined): Typegroep | null {
  return zoekMapping(ruweWaarde)?.groep ?? null
}

/** Subtype uit de taxonomie (docs/ontwerp/README.md § 5), of `null` als onbekend of niet specifiek genoeg. */
export function woningtypeSub(ruweWaarde: string | null | undefined): string | null {
  return zoekMapping(ruweWaarde)?.sub ?? null
}

export type WoningtypeGroepOpties = { groep: Typegroep; subs: string[] }

const GROEP_VOLGORDE: Typegroep[] = ['appartement', 'rijwoning', 'halfvrijstaand', 'vrijstaand']

/**
 * Groep → subtypes uit de taxonomie (docs/ontwerp/README.md § 5), afgeleid
 * van dezelfde MAPPING die de transactie-import gebruikt om te normaliseren —
 * één bron voor de taxonomie, zodat de woningtype-Select in de intake (item
 * 3.2, componenten/PropertyForm.tsx via lib/woningtypeOpties.ts) nooit uit de
 * pas kan lopen met de import-normalisatie hierboven.
 */
export function woningtypeTaxonomie(): WoningtypeGroepOpties[] {
  return GROEP_VOLGORDE.map(groep => ({
    groep,
    subs: MAPPING.filter((entry): entry is TaxonomieEntry & { sub: string } => entry.groep === groep && entry.sub !== null).map(entry => entry.sub),
  }))
}
