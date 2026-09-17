/**
 * Pure functies voor de kerncijfers op de startpagina (masterplan fase 1.6,
 * zie docs/roadmap.md). Los van React en Supabase, zodat ze zonder een
 * testdatabase te testen zijn — zie docs/ontwerpprincipes.md § Data: elke
 * statistiek toont zijn n en geeft bij te weinig data een waarschuwing i.p.v.
 * een schijnzeker getal.
 *
 * Geen pitch-concept meer (besluit Quinn 17 sep 2026, item 1.9c): er bestaan
 * geen "gewonnen/verloren pitches" en geen winratio meer — `berekenPitchCijfers`
 * en `PitchRow`/`PitchCijfers` zijn vervallen.
 */

/** Onder dit aantal is een gemiddelde/percentage/aandeel niet betekenisvol genoeg om te tonen (zie docs/ontwerpprincipes.md § Data). */
export const MIN_N_VOOR_GEMIDDELDE = 3

export type ObjectFaseRow = { fase: string }
export type EigenVerkoopRow = {
  verkoopprijs: number | null
  vraagprijs: number | null
  looptijd_dagen: number | null
  verkoopdatum: string | null
}

/** `EigenVerkoopRow` plus `plaats` — voor de marktaandeel-tegel (item 2.5, docs/roadmap.md). */
export type EigenVerkoopPlaatsRow = EigenVerkoopRow & { plaats: string | null }

/**
 * Filtert rijen op de laatste `maanden` maanden, t.o.v. `nu` (standaard:
 * vandaag — als parameter voor deterministisch testen). `datumVeld` haalt de
 * relevante datum uit elke rij (bv. `created_at` of `verkoopdatum`); rijen
 * zonder datum vallen buiten de selectie.
 */
export function filterOpLaatsteMaanden<T>(
  rows: T[],
  maanden: number,
  datumVeld: (row: T) => string | null | undefined,
  nu: Date = new Date(),
): T[] {
  const grens = new Date(nu)
  grens.setMonth(grens.getMonth() - maanden)
  return rows.filter(r => {
    const datum = datumVeld(r)
    if (!datum) return false
    return new Date(datum) >= grens
  })
}

/** Telt woningdossiers per fase. */
export function tellFases(rows: ObjectFaseRow[]): { verkoopadvies: number; inVerkoop: number; verkocht: number } {
  return {
    verkoopadvies: rows.filter(r => r.fase === 'verkoopadvies').length,
    inVerkoop: rows.filter(r => r.fase === 'in_verkoop').length,
    verkocht: rows.filter(r => r.fase === 'verkocht').length,
  }
}

export type VerkoopStatistieken = {
  aantal: number
  gemLooptijdDagen: number | null
  /** Gemiddeld percentage boven (positief) of onder (negatief) de vraagprijs. */
  gemPrijsTovVraagprijsPct: number | null
}

/** Filtert eigen verkopen op verkoopjaar. */
export function filterOpJaar(rows: EigenVerkoopRow[], jaar: number): EigenVerkoopRow[] {
  return rows.filter(r => r.verkoopdatum && new Date(r.verkoopdatum).getFullYear() === jaar)
}

/**
 * Gemiddelde looptijd en prijs-t.o.v.-vraagprijs over een set eigen verkopen.
 * Rijen zonder de benodigde velden tellen niet mee in dat specifieke
 * gemiddelde (geen 0 aannemen voor ontbrekende data).
 */
export function berekenVerkoopstatistieken(rows: EigenVerkoopRow[]): VerkoopStatistieken {
  const looptijden = rows.map(r => r.looptijd_dagen).filter((n): n is number => n != null)
  const gemLooptijdDagen = looptijden.length > 0
    ? Math.round(looptijden.reduce((a, b) => a + b, 0) / looptijden.length)
    : null

  const percentages = rows
    .filter(r => r.verkoopprijs != null && r.vraagprijs != null && r.vraagprijs > 0)
    .map(r => ((r.verkoopprijs as number) / (r.vraagprijs as number) - 1) * 100)
  const gemPrijsTovVraagprijsPct = percentages.length > 0
    ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10
    : null

  return { aantal: rows.length, gemLooptijdDagen, gemPrijsTovVraagprijsPct }
}

/** Filtert rijen op een datumveld tussen `vanaf` (inclusief) en `tot` (exclusief) — voor een begrensde "vorige periode". */
function filterTussen<T>(rows: T[], vanaf: Date, tot: Date, datumVeld: (row: T) => string | null | undefined): T[] {
  return rows.filter(r => {
    const datum = datumVeld(r)
    if (!datum) return false
    const d = new Date(datum)
    return d >= vanaf && d < tot
  })
}

export type VerkochtMetDelta = {
  aantal: number
  vorigAantal: number
  /** Procentuele verandering t.o.v. de voorgaande 12 maanden; null zonder vorige periode om tegen af te zetten. */
  deltaPct: number | null
}

/**
 * Verkocht laatste 12 maanden + de 12 maanden daarvoor, voor de delta-tegel
 * (item 2.5, docs/roadmap.md). Let op: `filterOpLaatsteMaanden` heeft alleen
 * een ondergrens, geen bovengrens — voor de vorige periode is dus een apart
 * begrensd filter nodig (anders overlapt hij met de huidige 12 maanden).
 */
export function berekenVerkochtMetDelta(rows: EigenVerkoopRow[], nu: Date = new Date()): VerkochtMetDelta {
  const huidig = filterOpLaatsteMaanden(rows, 12, r => r.verkoopdatum, nu)

  const twaalfTerug = new Date(nu)
  twaalfTerug.setMonth(twaalfTerug.getMonth() - 12)
  const vierentwintigTerug = new Date(nu)
  vierentwintigTerug.setMonth(vierentwintigTerug.getMonth() - 24)
  const vorig = filterTussen(rows, vierentwintigTerug, twaalfTerug, r => r.verkoopdatum)

  const aantal = huidig.length
  const vorigAantal = vorig.length
  const deltaPct = vorigAantal > 0 ? Math.round(((aantal - vorigAantal) / vorigAantal) * 1000) / 10 : null

  return { aantal, vorigAantal, deltaPct }
}

export type LooptijdVergelijk = {
  eigenGemLooptijd: number | null
  marktGemLooptijd: number | null
  /** eigen − markt in dagen; negatief betekent sneller dan de markt. Null als een van beide ontbreekt. */
  deltaDagen: number | null
}

/** Zet de eigen gemiddelde looptijd af tegen de marktlooptijd (uit `marktanalyseSamenvatting`). */
export function vergelijkLooptijdMetMarkt(eigenGemLooptijd: number | null, marktGemLooptijd: number | null): LooptijdVergelijk {
  const deltaDagen = eigenGemLooptijd != null && marktGemLooptijd != null
    ? Math.round(eigenGemLooptijd - marktGemLooptijd)
    : null
  return { eigenGemLooptijd, marktGemLooptijd, deltaDagen }
}

export type Marktaandeel = {
  eigenN: number
  marktN: number
  aandeelPct: number | null
}

/** Marktaandeel = eigen verkopen / alle verkopen in dezelfde plaats en periode. Null zonder markttransacties (nooit delen door 0). */
export function berekenMarktaandeel(eigenN: number, marktN: number): Marktaandeel {
  const aandeelPct = marktN > 0 ? Math.round((eigenN / marktN) * 1000) / 10 : null
  return { eigenN, marktN, aandeelPct }
}

/** Eigen verkopen in een specifieke plaats, laatste 12 maanden (voor de marktaandeel-teller). Plaatsvergelijking via `plaatsenGelijk`. */
export function filterOpPlaatsLaatste12Mnd(rows: EigenVerkoopPlaatsRow[], plaats: string, nu: Date = new Date()): EigenVerkoopPlaatsRow[] {
  const laatste12 = filterOpLaatsteMaanden(rows, 12, r => r.verkoopdatum, nu)
  return laatste12.filter(r => r.plaats != null && plaatsenGelijk(r.plaats, plaats))
}

// ─────────────────────────────────────────────────────────────────────────
// Plaatsnaam-normalisatie (item 2.5): het werkgebied gebruikt de officiële
// gemeentenaam ('s-Gravenhage, KantoorInstellingenSchema.werkgebied), de
// transactiedataset kan spreektaal bevatten (Den Haag). Losgelost met een
// vergelijkingssleutel + een kleine aliaslijst, i.p.v. de marktaandeel-tegel
// stil leeg te laten bij een spellingsverschil.
// ─────────────────────────────────────────────────────────────────────────

function kalePlaatsnaam(plaats: string): string {
  return plaats
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[-\s]+/g, '')
}

/** Bekende afwijkingen tussen werkgebied-spelling en dataset-spelling. Uitbreiden zodra een volgend kantoor er een tegenkomt. */
const PLAATS_ALIAS_GROEPEN: string[][] = [
  ["'s-Gravenhage", 'Den Haag'],
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
