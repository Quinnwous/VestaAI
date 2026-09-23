import type { TransactieRow } from './supabase'
import { gemiddelde } from './utils'
import { mediaan } from './prijsindex'

/**
 * Concurrentieanalyse (F6, besluit 16 sep 2026, zie CLAUDE.md §
 * Hoofdstructuur): marktaandeel, wie wint welk segment, presteren wij beter,
 * concurrent-profielen. Draait op `verkopend_kantoor` in de transactiedataset
 * zodra dat veld gevuld is (uit de Realworks-export of later Brainbay) — dit
 * bestand is databron-onafhankelijk, het datamodel hoeft er niet voor op de
 * schop (zie docs/roadmap.md § Blokkades).
 */

const EIGEN_KANTOOR_LABEL = 'Eigen kantoor'

function kantoorNaam(r: TransactieRow): string {
  if (r.eigen_verkoop) return EIGEN_KANTOOR_LABEL
  return r.verkopend_kantoor?.trim() || 'Onbekend'
}

/** Heeft de dataset genoeg informatie over wie welke transactie deed om concurrentie te tonen? */
export function heeftConcurrentiedata(rijen: TransactieRow[]): boolean {
  return rijen.some(r => !r.eigen_verkoop && !!r.verkopend_kantoor)
}

export type MarktaandeelPunt = { kantoor: string; aantal: number; aandeelPct: number }

export function marktaandeel(rijen: TransactieRow[]): MarktaandeelPunt[] {
  const totaal = rijen.length
  if (totaal === 0) return []
  const per = new Map<string, number>()
  for (const r of rijen) {
    const naam = kantoorNaam(r)
    per.set(naam, (per.get(naam) ?? 0) + 1)
  }
  return Array.from(per.entries())
    .map(([kantoor, aantal]) => ({ kantoor, aantal, aandeelPct: Math.round((aantal / totaal) * 1000) / 10 }))
    .sort((a, b) => b.aantal - a.aantal)
}

export type SegmentWinnaar = { segment: string; winnaar: string; aantal: number }

/** Per woningtype: welk kantoor verkocht daar het meest. */
export function wieWintWelkSegment(rijen: TransactieRow[]): SegmentWinnaar[] {
  const perSegment = new Map<string, Map<string, number>>()
  for (const r of rijen) {
    const segment = r.woningtype ?? 'Onbekend'
    const perKantoor = perSegment.get(segment) ?? new Map<string, number>()
    const naam = kantoorNaam(r)
    perKantoor.set(naam, (perKantoor.get(naam) ?? 0) + 1)
    perSegment.set(segment, perKantoor)
  }
  return Array.from(perSegment.entries()).map(([segment, perKantoor]) => {
    const [winnaar, aantal] = Array.from(perKantoor.entries()).sort((a, b) => b[1] - a[1])[0]
    return { segment, winnaar, aantal }
  })
}

export type PrestatieVergelijking = {
  eigenGemLooptijd: number | null
  regioGemLooptijd: number | null
  eigenGemPrijsverschilPct: number | null
  regioGemPrijsverschilPct: number | null
}

/** Eigen doorlooptijd en prijsverschil tegen het regiogemiddelde — het "wij verkopen sneller"-argument. */
export function presterenWijBeter(rijen: TransactieRow[]): PrestatieVergelijking {
  const eigen = rijen.filter(r => r.eigen_verkoop)
  const regio = rijen.filter(r => !r.eigen_verkoop)

  const looptijd = (set: TransactieRow[]) => gemiddelde(set.map(r => r.looptijd_dagen).filter((v): v is number => v !== null), 1)
  const verschil = (set: TransactieRow[]) =>
    gemiddelde(set.filter(r => r.verkoopprijs && r.vraagprijs).map(r => ((r.verkoopprijs! - r.vraagprijs!) / r.vraagprijs!) * 100), 1)

  return {
    eigenGemLooptijd: looptijd(eigen),
    regioGemLooptijd: looptijd(regio),
    eigenGemPrijsverschilPct: verschil(eigen),
    regioGemPrijsverschilPct: verschil(regio),
  }
}

export type ConcurrentProfiel = {
  kantoor: string
  aantal: number
  gemiddeldePrijs: number | null
  topSegment: string | null
}

export function concurrentProfielen(rijen: TransactieRow[]): ConcurrentProfiel[] {
  const perKantoor = new Map<string, TransactieRow[]>()
  for (const r of rijen) {
    const naam = kantoorNaam(r)
    const set = perKantoor.get(naam) ?? []
    set.push(r)
    perKantoor.set(naam, set)
  }

  return Array.from(perKantoor.entries())
    .map(([kantoor, set]) => {
      const prijzen = set.map(r => r.verkoopprijs).filter((v): v is number => v !== null)
      const perSegment = new Map<string, number>()
      for (const r of set) {
        const segment = r.woningtype ?? 'Onbekend'
        perSegment.set(segment, (perSegment.get(segment) ?? 0) + 1)
      }
      const topSegment = Array.from(perSegment.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      return {
        kantoor,
        aantal: set.length,
        gemiddeldePrijs: gemiddelde(prijzen, 1),
        topSegment,
      }
    })
    .sort((a, b) => b.aantal - a.aantal)
}

// ─────────────────────────────────────────────────────────────────────────
// v2 (item 6.3, docs/roadmap.md § 5 Fase 6 — port van
// docs/ontwerp/concurrentie.html): marktaandeel per jaar, "wie wint waar"
// (plaats × typegroep), "wij vs. markt" en het concurrentprofiel.
// Referentie-implementatie voor de RPC's in de nieuwe (nog niet toegepaste)
// migratie `supabase/migrations/<ts>_rpc_concurrentie_v2.sql` — zie
// `lib/transactiesQuery.rpc.test.ts` voor de live vergelijkingstests.
//
// ⚠️ Werkt op `verkopend_kantoor_norm` (kleine letters, gedeeld met de
// import-normalisatie), niet op het rauwe `verkopend_kantoor` dat v1
// hierboven gebruikt: twee schrijfwijzen van dezelfde naam
// ("Wassenaar Makelaars" vs "wassenaar makelaars") mogen niet als twee
// aparte concurrenten tellen. De sleutel is dus altijd genormaliseerd; de
// weergavenaam ("Wassenaar Makelaars") komt van de eerste rij in die groep.
// ─────────────────────────────────────────────────────────────────────────

/** Groepeersleutel (genormaliseerd) — nooit tonen, alleen om rijen bij elkaar te zoeken. */
function kantoorSleutelV2(r: TransactieRow): string {
  if (r.eigen_verkoop) return EIGEN_KANTOOR_LABEL
  return r.verkopend_kantoor_norm?.trim() || '__onbekend__'
}

/** Weergavenaam bij een rij — de originele schrijfwijze uit `verkopend_kantoor`. */
function kantoorWeergaveV2(r: TransactieRow): string {
  if (r.eigen_verkoop) return EIGEN_KANTOOR_LABEL
  return r.verkopend_kantoor?.trim() || 'Onbekend'
}

/** (verkoop - vraag) / vraag × 100 — `null` zonder verkoop- of vraagprijs. */
function pctTovVraag(r: TransactieRow): number | null {
  if (r.verkoopprijs == null || !r.vraagprijs) return null
  return ((r.verkoopprijs - r.vraagprijs) / r.vraagprijs) * 100
}

function jaarVan(iso: string): number {
  return new Date(iso).getUTCFullYear()
}

/**
 * v2 van `heeftConcurrentiedata`: kijkt naar `verkopend_kantoor_norm` (item
 * 6.3-spec) i.p.v. het rauwe veld. Aparte functie i.p.v. de bestaande
 * aan te passen — dat zou de bestaande RPC-vergelijkingstest tegen
 * `concurrentie_marktaandeel`/`concurrentie_segmenten` (die nog op het rauwe
 * veld draaien) kunnen laten wankelen.
 */
export function heeftConcurrentiedataV2(rijen: TransactieRow[]): boolean {
  return rijen.some(r => !r.eigen_verkoop && !!r.verkopend_kantoor_norm?.trim())
}

export type RanglijstRij = { kantoor: string; aantal: number; aandeelPct: number; mediaanLooptijd: number | null }

/** "Kantoren in dit segment" — marktaandeel + mediaan looptijd per kantoor, gesorteerd op aantal. Referentie voor RPC `concurrentie_ranglijst`. */
export function ranglijstPerKantoor(rijen: TransactieRow[]): RanglijstRij[] {
  const totaal = rijen.length
  if (totaal === 0) return []
  const perSleutel = new Map<string, { weergave: string; rijen: TransactieRow[] }>()
  for (const r of rijen) {
    const sleutel = kantoorSleutelV2(r)
    const bestaand = perSleutel.get(sleutel)
    if (bestaand) bestaand.rijen.push(r)
    else perSleutel.set(sleutel, { weergave: kantoorWeergaveV2(r), rijen: [r] })
  }
  return Array.from(perSleutel.values())
    .map(({ weergave, rijen: set }) => ({
      kantoor: weergave,
      aantal: set.length,
      aandeelPct: Math.round((set.length / totaal) * 1000) / 10,
      mediaanLooptijd: mediaan(set.map(r => r.looptijd_dagen).filter((v): v is number => v != null)),
    }))
    .sort((a, b) => b.aantal - a.aantal)
}

export type WijVsMarkt = {
  looptijdWij: number | null
  looptijdMarkt: number | null
  ratioWij: number | null
  ratioMarkt: number | null
  m2Wij: number | null
  m2Markt: number | null
  nWij: number
  nMarkt: number
}

/**
 * "Wij" vs. "markt" (de rest) binnen de huidige selectie. Zelfde statistiek
 * per veld als het prototype (`docs/ontwerp/concurrentie.html`): looptijd en
 * €/m² zijn mediaan, t.o.v. vraagprijs is een gemiddelde. Referentie voor RPC
 * `concurrentie_wij_vs_markt`.
 */
export function wijVsMarkt(rijen: TransactieRow[]): WijVsMarkt {
  const wij = rijen.filter(r => r.eigen_verkoop)
  const markt = rijen.filter(r => !r.eigen_verkoop)
  return {
    looptijdWij: mediaan(wij.map(r => r.looptijd_dagen).filter((v): v is number => v != null)),
    looptijdMarkt: mediaan(markt.map(r => r.looptijd_dagen).filter((v): v is number => v != null)),
    ratioWij: gemiddelde(wij.map(pctTovVraag).filter((v): v is number => v != null), 1),
    ratioMarkt: gemiddelde(markt.map(pctTovVraag).filter((v): v is number => v != null), 1),
    m2Wij: mediaan(wij.map(r => r.prijs_m2).filter((v): v is number => v != null)),
    m2Markt: mediaan(markt.map(r => r.prijs_m2).filter((v): v is number => v != null)),
    nWij: wij.length,
    nMarkt: markt.length,
  }
}

export type AandeelJaarRij = { jaar: number; kantoor: string; aantal: number; totaal: number }

/**
 * Marktaandeel per jaar voor de gevraagde kantoor-weergavenamen (of alle
 * kantoren zonder `kantoren`) — `totaal` is per jaar altijd het totaal over
 * ALLE kantoren, ook als de output tot een subset beperkt is (voor het
 * percentage). Bewust ONAFHANKELIJK van het periodefilter (roadmap 6.3): geef
 * hier de op plaats/type/prijsklasse gefilterde, maar niet op periode
 * gefilterde rijenset mee. Referentie voor RPC `concurrentie_aandeel_jaar`.
 */
export function aandeelPerJaar(rijen: TransactieRow[], kantoren?: string[]): AandeelJaarRij[] {
  const perJaar = new Map<number, TransactieRow[]>()
  for (const r of rijen) {
    if (!r.verkoopdatum) continue
    const jaar = jaarVan(r.verkoopdatum)
    const set = perJaar.get(jaar) ?? []
    set.push(r)
    perJaar.set(jaar, set)
  }
  const resultaat: AandeelJaarRij[] = []
  for (const [jaar, set] of Array.from(perJaar.entries()).sort((a, b) => a[0] - b[0])) {
    const totaal = set.length
    const perSleutel = new Map<string, { weergave: string; aantal: number }>()
    for (const r of set) {
      const sleutel = kantoorSleutelV2(r)
      const bestaand = perSleutel.get(sleutel)
      if (bestaand) bestaand.aantal++
      else perSleutel.set(sleutel, { weergave: kantoorWeergaveV2(r), aantal: 1 })
    }
    for (const { weergave, aantal } of Array.from(perSleutel.values())) {
      if (kantoren && !kantoren.includes(weergave)) continue
      resultaat.push({ jaar, kantoor: weergave, aantal, totaal })
    }
  }
  return resultaat
}

export type MatrixKantoorAandeel = { kantoor: string; aantal: number; aandeelPct: number }
export type MatrixCel = { rijSleutel: string; rijLabel: string; woningtypeGroep: string; n: number; top3: MatrixKantoorAandeel[] }

/**
 * "Wie wint waar": top-kantoor (+ top 3 voor de tooltip) per rij × woningtype-
 * groep. `opWijkniveau = true` splitst rijen naar wijk (`"plaats|wijk"`,
 * gebruikt zodra precies één plaats geselecteerd is — zie de explorer),
 * anders naar plaats. Rijen zonder plaats/wijk/woningtype_groep tellen niet
 * mee. Referentie voor RPC `concurrentie_matrix`.
 */
export function matrixWieWintWaar(rijen: TransactieRow[], opWijkniveau: boolean): MatrixCel[] {
  const perCel = new Map<string, { rijSleutel: string; rijLabel: string; woningtypeGroep: string; rijen: TransactieRow[] }>()
  for (const r of rijen) {
    const groep = r.woningtype_groep
    if (!r.plaats || !groep) continue
    if (opWijkniveau && !r.wijk) continue
    const rijSleutel = opWijkniveau ? `${r.plaats}|${r.wijk}` : r.plaats
    const rijLabel = opWijkniveau ? r.wijk! : r.plaats
    const key = `${rijSleutel}::${groep}`
    const bestaand = perCel.get(key)
    if (bestaand) bestaand.rijen.push(r)
    else perCel.set(key, { rijSleutel, rijLabel, woningtypeGroep: groep, rijen: [r] })
  }
  return Array.from(perCel.values()).map(({ rijSleutel, rijLabel, woningtypeGroep, rijen: set }) => {
    const perSleutel = new Map<string, { weergave: string; aantal: number }>()
    for (const r of set) {
      const sleutel = kantoorSleutelV2(r)
      const bestaand = perSleutel.get(sleutel)
      if (bestaand) bestaand.aantal++
      else perSleutel.set(sleutel, { weergave: kantoorWeergaveV2(r), aantal: 1 })
    }
    const top3 = Array.from(perSleutel.values())
      .map(({ weergave, aantal }) => ({ kantoor: weergave, aantal, aandeelPct: Math.round((aantal / set.length) * 1000) / 10 }))
      .sort((a, b) => b.aantal - a.aantal)
      .slice(0, 3)
    return { rijSleutel, rijLabel, woningtypeGroep, n: set.length, top3 }
  })
}

export type ConcurrentProfielV2 = {
  kantoor: string
  n: number
  aandeelPct: number | null
  mediaanLooptijd: number | null
  gemRatio: number | null
  verdeling: { woningtypeGroep: string; n: number }[]
  sterkstePlaats: string | null
  sterksteAandeelPct: number | null
  trend: { jaar: number; aantal: number }[]
}

/**
 * Concurrentprofiel voor de drawer (item 6.3). `rijenSelectie` = de huidige
 * pagina-filterselectie (voor n/aandeel/mediaan looptijd/gem. ratio/
 * verdeling per woningtype); `rijenRegio` = de volledige kantoordataset
 * (alleen `uitgesloten_reden is null`, geen paginafilters) voor de sterkste
 * plaats en de trend per jaar — bewust breder dan de paginaselectie, zie de
 * opleverrapportage van 6.3 voor de afweging t.o.v. het prototype (dat een
 * middenweg-verbreding gebruikt: plaats/type-filter negeren maar
 * periode/klasse niet). Referentie voor RPC `concurrentie_profiel`.
 */
export function concurrentProfielV2(
  rijenSelectie: TransactieRow[],
  rijenRegio: TransactieRow[],
  kantoorNaamWeergave: string,
): ConcurrentProfielV2 {
  const sleutel = kantoorNaamWeergave === EIGEN_KANTOOR_LABEL ? EIGEN_KANTOOR_LABEL : kantoorNaamWeergave.trim().toLowerCase()
  const isDitKantoor = (r: TransactieRow) => kantoorSleutelV2(r) === sleutel

  const setSelectie = rijenSelectie.filter(isDitKantoor)
  const n = setSelectie.length
  const aandeelPct = rijenSelectie.length ? Math.round((n / rijenSelectie.length) * 1000) / 10 : null
  const mediaanLooptijd = mediaan(setSelectie.map(r => r.looptijd_dagen).filter((v): v is number => v != null))
  const gemRatio = gemiddelde(setSelectie.map(pctTovVraag).filter((v): v is number => v != null), 1)

  const perGroep = new Map<string, number>()
  for (const r of setSelectie) {
    const groep = r.woningtype_groep ?? 'onbekend'
    perGroep.set(groep, (perGroep.get(groep) ?? 0) + 1)
  }
  const verdeling = Array.from(perGroep.entries()).map(([woningtypeGroep, telling]) => ({ woningtypeGroep, n: telling }))

  const perPlaats = new Map<string, { eigen: number; totaal: number }>()
  for (const r of rijenRegio) {
    if (!r.plaats) continue
    const rec = perPlaats.get(r.plaats) ?? { eigen: 0, totaal: 0 }
    rec.totaal++
    if (isDitKantoor(r)) rec.eigen++
    perPlaats.set(r.plaats, rec)
  }
  let sterkstePlaats: string | null = null
  let sterksteAandeelPct: number | null = null
  for (const [plaats, rec] of Array.from(perPlaats.entries())) {
    if (!rec.eigen) continue
    const pct = (rec.eigen / rec.totaal) * 100
    if (sterksteAandeelPct == null || pct > sterksteAandeelPct) {
      sterkstePlaats = plaats
      sterksteAandeelPct = Math.round(pct * 10) / 10
    }
  }

  const perJaar = new Map<number, number>()
  for (const r of rijenRegio.filter(isDitKantoor)) {
    if (!r.verkoopdatum) continue
    const jaar = jaarVan(r.verkoopdatum)
    perJaar.set(jaar, (perJaar.get(jaar) ?? 0) + 1)
  }
  const trend = Array.from(perJaar.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([jaar, aantal]) => ({ jaar, aantal }))

  return { kantoor: kantoorNaamWeergave, n, aandeelPct, mediaanLooptijd, gemRatio, verdeling, sterkstePlaats, sterksteAandeelPct, trend }
}
