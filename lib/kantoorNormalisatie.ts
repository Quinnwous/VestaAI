/**
 * Normalisatie van kantoornamen zoals ze in Brainbay/Realworks-exports
 * voorkomen (item 5.2, docs/roadmap.md § Fase 5) — dezelfde makelaar duikt
 * in een export op als "i4 Housing B.V.", "I4housing Makelaars" of
 * "I4 Housing Makelaardij o.g.", en dat moet allemaal naar dezelfde norm
 * herleiden zodat `eigen_verkoop` betrouwbaar te bepalen is via
 * `instellingen_json.kantoor_aliassen` (lib/schemas.ts
 * `KantoorInstellingenSchema`).
 *
 * Ontwerpkeuze: spaties blijven NIET in de norm. Reden: "i4 Housing" (met
 * spatie) en "I4housing" (aaneen) moeten identiek normaliseren — dat is
 * alleen mogelijk als spaties na het verwijderen van de ruiswoorden ook zelf
 * verdwijnen, niet alleen worden samengevoegd tot één spatie.
 */

// Woorden die zelf geen deel van de bedrijfsidentiteit zijn — rechtsvorm,
// beroepsaanduiding en generieke toevoegingen. Losstaand na stap 3
// hieronder (elk leesteken wordt daar al een spatie), dus "B.V." / "o.g."
// staan hier al zonder punten.
const RUISWOORDEN = new Set(['bv', 'bvba', 'makelaars', 'makelaardij', 'makelaar', 'nvm', 'og', 'partners'])

/** Verwijdert diakrieten (é → e, ë → e, …) zonder externe afhankelijkheid. */
function zonderDiakrieten(tekst: string): string {
  return tekst.normalize('NFKD').replace(/[̀-ͯ]/g, '')
}

/**
 * Genormaliseerde kantoornaam: lowercase, zonder diakrieten, zonder
 * rechtsvorm/beroeps-ruis (B.V./BV/Makelaars/Makelaardij/NVM/o.g./Partners,
 * incl. het "&" ervoor), zonder leestekens en zonder spaties. `null` voor
 * een lege/ontbrekende naam — nooit een lege string als "match".
 */
export function normaliseerKantoornaam(naam: string | null | undefined): string | null {
  if (!naam) return null

  const schoon = zonderDiakrieten(naam)
    .toLowerCase()
    // Punten eerst weg (zonder scheidingsteken): "B.V." en "o.g." moeten als
    // één woord "bv"/"og" overblijven, niet als losse letters "b"/"v".
    .replace(/\./g, '')
    // Elk overig niet-alfanumeriek teken (spatie, komma, &, -, /, …) wordt
    // een scheidingsteken, zodat "Jansen-Makelaars" → "jansen makelaars"
    // netjes in losse woorden uiteenvalt.
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (!schoon) return null

  const woorden = schoon.split(' ').filter(w => w && !RUISWOORDEN.has(w))
  const norm = woorden.join('')
  return norm || null
}

/**
 * Is `naam` (uit een import) hetzelfde kantoor als een van de opgegeven
 * `aliassen` (`instellingen_json.kantoor_aliassen`)? Vergelijkt op de
 * normalisatie hierboven — een lege/onbepaalbare norm is nooit een match.
 */
export function isEigenKantoor(naam: string | null | undefined, aliassen: string[]): boolean {
  const norm = normaliseerKantoornaam(naam)
  if (!norm) return false
  return aliassen.some(alias => normaliseerKantoornaam(alias) === norm)
}
