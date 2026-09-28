/**
 * Plaatsnaam-normalisatie (item J1, docs/specs/j1-plaatsnormalisatie.md).
 * Verhuisd uit lib/kerncijfers.ts (item 2.5), waar dit begon als vergelijkings-
 * hulp voor de marktaandeel-tegel op het dashboard. Nu de centrale plek voor
 * élke plaatsnaam-vergelijking én -normalisatie in de app.
 *
 * Aanleiding (zie de spec): BAG, PDOK en de Brainbay-export schrijven de
 * officiële gemeentenaam ('s-Gravenhage), i4housing's werkgebied en het
 * spraakgebruik "Den Haag". De RPC's op `transacties` vergelijken plaatsen
 * exact (`t.plaats = any(...)`), dus zonder normalisatie levert een
 * spellingsverschil stil nul resultaten op i.p.v. de echte cijfers.
 *
 * Besluit: de canonieke schrijfwijze in de database is de spreektaal
 * ("Den Haag"). We normaliseren bij het schrijven (import, zie
 * lib/importPijplijn.ts) met `canoniekePlaats()`, zodat elke latere exacte
 * vergelijking vanzelf klopt. De aliaslijst (`plaatsSleutel`/`plaatsenGelijk`/
 * `plaatsVarianten`) blijft daarnaast bestaan voor vergelijkingen met invoer
 * van buiten de database (werkgebied-instelling, PDOK-treffers, RPC-filters).
 */

function kalePlaatsnaam(plaats: string): string {
  return plaats
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[-\s]+/g, '')
}

/**
 * Bekende afwijkingen tussen schrijfwijzen van dezelfde plaats. Het eerste
 * element van elke groep is de canonieke schrijfwijze (zie `canoniekePlaats`)
 * — de spreektaal-variant, niet per se de officiële gemeentenaam. De overige
 * elementen zijn andere schrijfwijzen die in bronnen (BAG, PDOK, Brainbay/
 * Realworks-exports, handmatige werkgebied-invoer) voorkomen.
 * Uitbreiden zodra een volgend kantoor een vergelijkbaar verschil tegenkomt.
 */
const PLAATS_ALIAS_GROEPEN: string[][] = [
  ['Den Haag', "'s-Gravenhage", 's-Gravenhage', 'S GRAVENHAGE'],
]

const PLAATS_ALIAS_SLEUTEL = new Map<string, string>()
for (const groep of PLAATS_ALIAS_GROEPEN) {
  const sleutel = kalePlaatsnaam(groep[0])
  for (const naam of groep) PLAATS_ALIAS_SLEUTEL.set(kalePlaatsnaam(naam), sleutel)
}

/** Vergelijkingssleutel voor een plaatsnaam: kaal + aliasgroep. */
export function plaatsSleutel(plaats: string): string {
  const kaal = kalePlaatsnaam(plaats)
  return PLAATS_ALIAS_SLEUTEL.get(kaal) ?? kaal
}

/** Of twee plaatsnamen dezelfde plaats bedoelen (spelling-/hoofdletterongevoelig, met aliaslijst). */
export function plaatsenGelijk(a: string, b: string): boolean {
  return plaatsSleutel(a) === plaatsSleutel(b)
}

/**
 * Schrijfwijze-varianten van een plaatsnaam, te gebruiken als RPC-filter
 * (`TransactieFilter.plaatsen`) — de RPC's vergelijken exact (`t.plaats = any (...)`,
 * zie supabase/migrations/20260917_rpc_transacties.sql), dus een spellingsverschil
 * met de dataset zou anders 0 rijen opleveren i.p.v. de echte cijfers.
 */
export function plaatsVarianten(plaats: string): string[] {
  const sleutel = plaatsSleutel(plaats)
  const groep = PLAATS_ALIAS_GROEPEN.find(g => kalePlaatsnaam(g[0]) === sleutel)
  if (!groep) return [plaats]
  return [plaats, ...groep.filter(naam => kalePlaatsnaam(naam) !== kalePlaatsnaam(plaats))]
}

// ─────────────────────────────────────────────────────────────────────────
// Canonieke schrijfwijze (item J1) — voor het NORMALISEREN bij het schrijven
// (import), in tegenstelling tot bovenstaande functies die alleen VERGELIJKEN.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Nederlandse tussenvoegsels die in een plaatsnaam laag blijven, behalve als
 * eerste woord ("Bergen op Zoom", niet "Bergen Op Zoom"; "'s-Gravenzande" valt
 * onder de aparte 's-voorvoegsel-afhandeling hieronder).
 */
const TUSSENVOEGSELS = new Set([
  'aan', 'achter', 'bij', 'boven', 'de', 'den', 'der', 'het', 'in',
  'onder', 'op', 'over', 'te', 'ten', 'ter', 'tot', 'van', 'voor',
])

/** Zet alleen de eerste letter om naar een hoofdletter; de rest van het woord blijft ongemoeid (geen bestaande hoofdletters platslaan). */
function hoofdletterEersteLetter(woord: string): string {
  if (!woord) return woord
  return woord[0].toUpperCase() + woord.slice(1)
}

/** Eén woord van een plaatsnaam netjes maken: tussenvoegsel (niet als eerste woord), 's-voorvoegsel (zoals 's-Hertogenbosch), of gewoon een hoofdletter vooraan. */
function formatteerWoord(woord: string, eersteWoord: boolean): string {
  const sVoorvoegsel = woord.match(/^('s)-(.+)$/i)
  if (sVoorvoegsel) {
    return `'s-${hoofdletterEersteLetter(sVoorvoegsel[2])}`
  }
  if (!eersteWoord && TUSSENVOEGSELS.has(woord.toLowerCase())) {
    return woord.toLowerCase()
  }
  return hoofdletterEersteLetter(woord)
}

/** Nette hoofdletters/witruimte voor een plaatsnaam zonder bekende aliasgroep — sloopt geen tussenvoegsels ('s-Hertogenbosch, Bergen op Zoom). */
function nettePlaatsnaam(naam: string): string {
  const schoon = naam.trim().replace(/\s+/g, ' ')
  if (!schoon) return schoon
  return schoon
    .split(' ')
    .map((woord, i) => formatteerWoord(woord, i === 0))
    .join(' ')
}

/**
 * De canonieke schrijfwijze van een plaatsnaam: bij een bekende aliasgroep
 * altijd het eerste element van die groep (de spreektaal-variant, "Den Haag"
 * i.p.v. "'s-Gravenhage"); anders een net geformatteerde versie van de invoer
 * (hoofdletters/witruimte), zonder tussenvoegsels te slopen.
 *
 * Gebruikt bij het SCHRIJVEN naar `transacties.plaats` (lib/importPijplijn.ts)
 * zodat latere exacte vergelijkingen (RPC's, werkgebied-filters) vanzelf
 * kloppen — zie de module-docstring hierboven.
 */
export function canoniekePlaats(naam: string): string {
  const schoon = naam.trim().replace(/\s+/g, ' ')
  if (!schoon) return schoon
  const sleutel = plaatsSleutel(schoon)
  const groep = PLAATS_ALIAS_GROEPEN.find(g => kalePlaatsnaam(g[0]) === sleutel)
  if (groep) return groep[0]
  return nettePlaatsnaam(schoon)
}
