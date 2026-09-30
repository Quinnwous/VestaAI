import { z } from 'zod'
import type { TransactieRow } from './supabase'
import { mediaan, kwartaalVan } from './prijsindex'
import type { TransactieFilter } from './schemas'
import { woningtypeTaxonomie } from './transactieNormalisatie'
import { bereikGelijk } from './filterVergelijk'
import type { MarktanalyseSamenvattingRij } from './transactiesQuery'
import { canoniekePlaats } from './plaatsNormalisatie'

/**
 * Aggregatielogica voor de interactieve marktanalyse-explorer (F6, besluit 16
 * sep 2026: geen statisch dashboard, wel filters die live hertekenen — zie
 * CLAUDE.md § Hoofdstructuur). Puur functies, geen React — makkelijk te
 * testen en herbruikbaar tussen de grafiek en een eventuele CSV-export.
 */

/**
 * Ondergrens voor een "betrouwbaar" cijfer (docs/ontwerp/principes.md § Data:
 * "te weinig data → een waarschuwing, geen schijnzeker getal"). Gedeeld door
 * de kerncijfer-tegels en de segment-A-vs-B-vergelijking (F1) zodat beide
 * exact dezelfde drempel hanteren.
 */
export const MIN_N_BETROUWBAAR = 6

// ─────────────────────────────────────────────────────────────────────────
// v2 (item 6.1, docs/roadmap.md § 5 Fase 6): pure helpers voor de
// marktanalyse-explorer v2 — periode → datumbereik voor de RPC-filters,
// delta t.o.v. de vorige periode (getest, zie lib/marktanalyse.test.ts) en de
// vaste prijsklasse-indeling (poort van docs/ontwerp/marktanalyse.html `KLASSEN`).
// ─────────────────────────────────────────────────────────────────────────

export type PeriodeMaanden = 12 | 24 | 36 | 0 // 0 = "alles"

/**
 * Zet een periode-preset om naar `{ datumVan, datumTot }` voor
 * `TransactieFilterSchema` (`datum_van`/`datum_tot`). `datumTot` = de laatste
 * bekende verkoopdatum in de dataset ("data t/m", niet vandaag — anders
 * telt een dataset die drie weken achterloopt zichzelf als "weinig data").
 * `periode = 0` ("Alles"): geen ondergrens, de RPC's `marktanalyse_samenvatting`
 * bepaalt dan zelf de volledige span (en de daaraan voorafgaande periode voor
 * de vergelijking, die dan meestal leeg is — "geen vergelijking" in de UI).
 */
export function periodeNaarDatums(periode: PeriodeMaanden, datumTot: string | null): { datumVan?: string; datumTot?: string } {
  if (!datumTot) return {}
  if (periode === 0) return { datumTot }
  const tot = new Date(datumTot)
  const van = new Date(tot)
  van.setUTCMonth(van.getUTCMonth() - periode)
  van.setUTCDate(van.getUTCDate() + 1) // inclusief: 12 mnd terug + 1 dag = exact 12 maanden lang
  return { datumVan: van.toISOString().slice(0, 10), datumTot }
}

/**
 * Delta t.o.v. de vorige periode. `relatief` (%) voor prijs/m²/aantal,
 * `absoluut` (bv. dagen of procentpunten) voor looptijd en t.o.v.-vraagprijs
 * — zie de tegel-definities in `docs/ontwerp/marktanalyse.html` `renderTegels()`.
 * `null` bij ontbrekende waarden of een vorige waarde van 0 (delen door nul).
 */
export function berekenDelta(nu: number | null, vorig: number | null, type: 'relatief' | 'absoluut' = 'relatief'): number | null {
  if (nu == null || vorig == null) return null
  if (type === 'absoluut') return nu - vorig
  if (vorig === 0) return null
  return (nu / vorig - 1) * 100
}

/** Richting van een delta voor de tegelkleur; `gunstig` = +1 (hoger is beter) of −1 (lager is beter). */
export function richtingVanDelta(delta: number | null, gunstig: 1 | -1 | 0): 'op' | 'neer' | 'gelijk' | null {
  if (delta == null) return null
  if (delta === 0) return 'gelijk'
  if (!gunstig) return null
  const teken = delta > 0 ? 1 : -1
  return teken === gunstig ? 'op' : 'neer'
}

export type Prijsklasse = { key: string; label: string; min: number; max: number }

/** Vaste prijsklasse-indeling — poort van `KLASSEN` in `docs/ontwerp/marktanalyse.html`. */
export const PRIJSKLASSEN: Prijsklasse[] = [
  { key: 'k1', label: '< € 500 k', min: 0, max: 500_000 },
  { key: 'k2', label: '€ 500 – 750 k', min: 500_000, max: 750_000 },
  { key: 'k3', label: '€ 750 k – 1 mln', min: 750_000, max: 1_000_000 },
  { key: 'k4', label: '€ 1 – 1,5 mln', min: 1_000_000, max: 1_500_000 },
  { key: 'k5', label: '€ 1,5 – 2,5 mln', min: 1_500_000, max: 2_500_000 },
  { key: 'k6', label: '> € 2,5 mln', min: 2_500_000, max: Infinity },
]

/** `{ prijs_min, prijs_max }` voor `TransactieFilterSchema` — `Infinity` wordt weggelaten (geen bovengrens). */
export function prijsklasseFilter(key: string): { prijs_min?: number; prijs_max?: number } {
  const k = PRIJSKLASSEN.find(k => k.key === key)
  if (!k) return {}
  return { prijs_min: k.min, ...(Number.isFinite(k.max) ? { prijs_max: k.max } : {}) }
}

/**
 * Filtermodel voor de eigen-verkopenreeks in de explorer v2 ("wij" — patroon 1,
 * docs/architectuur.md § 1: client-side, want ≤ 2.000 rijen). Zelfde velden als
 * `TransactieFilterSchema` (lib/schemas.ts) op de RPC-kant, zodat "wij" en
 * "markt" met exact dezelfde definitie filteren. `wijken` is
 * `"plaats|wijk"`, zoals in de URL-state en `docs/ontwerp/kit.js`.
 */
export type MarktanalyseFilterV2 = {
  plaatsen: string[]
  wijken: string[]
  typen: string[]
  datumVan?: string
  datumTot?: string
  prijsMin?: number
  prijsMax?: number
  oppMin?: number
  oppMax?: number
  bouwjaarMin?: number
  bouwjaarMax?: number
  energielabels: string[]
  kamersMin?: number
  perceelMin?: number
  perceelMax?: number
  tuin?: boolean
  garage?: boolean
  tovVraagprijs?: 'alle' | 'boven' | 'op_of_onder'
}

/**
 * Filtert eigen verkopen client-side — dezelfde semantiek als de SQL-helper
 * `transacties_gefilterd()` (migratie 20260917_rpc_transacties.sql): een
 * actief min/max-filter sluit een rij met een ontbrekende waarde uit (bv.
 * geen `perceel_m2` bij een appartement + een actief perceelfilter), zodat
 * "wij" en "markt" nooit stilzwijgend een andere populatie tellen.
 */
export function filterEigenRijen(rijen: TransactieRow[], f: MarktanalyseFilterV2): TransactieRow[] {
  return rijen.filter(r => {
    if (f.plaatsen.length && !(r.plaats && f.plaatsen.includes(r.plaats))) return false
    if (f.wijken.length && !f.wijken.includes(`${r.plaats ?? ''}|${r.wijk ?? ''}`)) return false
    if (f.typen.length && !(r.woningtype_sub && f.typen.includes(r.woningtype_sub))) return false
    if (f.datumVan && (!r.verkoopdatum || r.verkoopdatum < f.datumVan)) return false
    if (f.datumTot && (!r.verkoopdatum || r.verkoopdatum > f.datumTot)) return false
    if (f.prijsMin != null && (r.verkoopprijs == null || r.verkoopprijs < f.prijsMin)) return false
    if (f.prijsMax != null && (r.verkoopprijs == null || r.verkoopprijs > f.prijsMax)) return false
    if (f.oppMin != null && (r.woonoppervlak_m2 == null || r.woonoppervlak_m2 < f.oppMin)) return false
    if (f.oppMax != null && (r.woonoppervlak_m2 == null || r.woonoppervlak_m2 > f.oppMax)) return false
    if (f.bouwjaarMin != null && (r.bouwjaar == null || r.bouwjaar < f.bouwjaarMin)) return false
    if (f.bouwjaarMax != null && (r.bouwjaar == null || r.bouwjaar > f.bouwjaarMax)) return false
    if (f.energielabels.length && !(r.energielabel && f.energielabels.includes(r.energielabel))) return false
    if (f.kamersMin != null && (r.kamers == null || r.kamers < f.kamersMin)) return false
    if (f.perceelMin != null && (r.perceel_m2 == null || r.perceel_m2 < f.perceelMin)) return false
    if (f.perceelMax != null && (r.perceel_m2 == null || r.perceel_m2 > f.perceelMax)) return false
    if (f.tuin && !r.tuin) return false
    if (f.garage && !r.garage) return false
    if (f.tovVraagprijs === 'boven' && !(r.verkoopprijs != null && r.vraagprijs != null && r.verkoopprijs > r.vraagprijs)) return false
    if (f.tovVraagprijs === 'op_of_onder' && !(r.verkoopprijs != null && r.vraagprijs != null && r.verkoopprijs <= r.vraagprijs)) return false
    return true
  })
}

export type ReeksRijV2 = {
  kwartaal: string
  n: number
  mediaanPrijs: number | null
  mediaanM2: number | null
  mediaanLooptijd: number | null
  pctTovVraag: number | null
}

/**
 * Kwartaalreeks (mediaan, niet gemiddelde) uit een reeds gefilterde rijenset —
 * dezelfde statistiek als de RPC `marktanalyse_reeks` (`percentile_cont(0.5)`),
 * zodat de "wij"-lijn in de grafiek en de tegel-sparkline vergelijkbaar zijn
 * met de "markt"-lijn. Alleen rijen met een `verkoopdatum` tellen mee.
 */
export function wijKwartaalReeks(rijen: TransactieRow[]): ReeksRijV2[] {
  const groepen = new Map<string, TransactieRow[]>()
  for (const r of rijen) {
    if (!r.verkoopdatum) continue
    const key = kwartaalVan(r.verkoopdatum)
    const groep = groepen.get(key) ?? []
    groep.push(r)
    groepen.set(key, groep)
  }
  return Array.from(groepen.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kwartaal, groep]) => {
      const prijzen = groep.map(r => r.verkoopprijs).filter((v): v is number => v != null)
      const m2prijzen = groep.map(r => r.prijs_m2).filter((v): v is number => v != null)
      const looptijden = groep.map(r => r.looptijd_dagen).filter((v): v is number => v != null)
      const ratios = groep
        .filter(r => r.verkoopprijs != null && r.vraagprijs)
        .map(r => ((r.verkoopprijs! - r.vraagprijs!) / r.vraagprijs!) * 100)
      return {
        kwartaal,
        n: groep.length,
        mediaanPrijs: mediaan(prijzen),
        mediaanM2: mediaan(m2prijzen),
        mediaanLooptijd: mediaan(looptijden),
        pctTovVraag: mediaan(ratios),
      }
    })
}

// ─────────────────────────────────────────────────────────────────────────
// FilterBar-staat → RPC-filter (item 6.1): de URL-state (`useFilterState`)
// gebruikt bereiken (`[min, max]`) en presets (periode, prijsklasse) die
// compacter zijn dan `TransactieFilterSchema` — deze functies zijn de enige
// plek die de vertaling maakt, zodat "wij" (filterEigenRijen) en "markt"
// (de RPC's) altijd exact dezelfde filterstand toepassen.
// ─────────────────────────────────────────────────────────────────────────

export const PRIJS_BEREIK: [number, number] = [0, 5_000_000]
export const OPP_BEREIK: [number, number] = [30, 500]
export const BOUWJAAR_BEREIK: [number, number] = [1900, 2030]
export const PERCEEL_BEREIK: [number, number] = [0, 5000]

/**
 * Zod-schema voor `useFilterState` (item 6.1, docs/architectuur.md § 7) —
 * bereiken als 2-tallen (schuivers), lijsten als arrays (multi-select),
 * `klasse`/`b`/`bPlaats`/`bGroep` voor de prijsklasse-crossfilter resp.
 * segment B. `kamers: 0` = geen ondergrens.
 */
export const MarktanalyseFilterSchema = z.object({
  plaatsen: z.array(z.string()),
  wijken: z.array(z.string()),
  typen: z.array(z.string()),
  periode: z.union([z.literal(12), z.literal(24), z.literal(36), z.literal(0)]),
  prijs: z.tuple([z.number(), z.number()]),
  opp: z.tuple([z.number(), z.number()]),
  bouwjaar: z.tuple([z.number(), z.number()]),
  energielabels: z.array(z.string()),
  kamers: z.number(),
  perceel: z.tuple([z.number(), z.number()]),
  tuin: z.boolean(),
  garage: z.boolean(),
  tov: z.enum(['alle', 'boven', 'op_of_onder']),
  klasse: z.string(),
  b: z.boolean(),
  bPlaats: z.string(),
  bGroep: z.string(),
})

export type MarktanalyseFilterState = z.infer<typeof MarktanalyseFilterSchema>

/**
 * Standaardfilter = werkgebied van het kantoor (docs/roadmap.md item 6.1:
 * "Standaardfilter = werkgebied van het kantoor"). `werkgebiedPlaatsen` komt
 * rechtstreeks uit `KantoorInstellingenSchema.werkgebied` (vrije invoer door
 * de platform-admin) en kan dus "'s-Gravenhage" bevatten terwijl de
 * transactiedataset "Den Haag" schrijft (item J1) — eerst door
 * `canoniekePlaats` halen, anders levert de RPC-exact-match stil nul rijen op.
 */
export function standaardFilterState(werkgebiedPlaatsen: string[]): MarktanalyseFilterState {
  return {
    plaatsen: werkgebiedPlaatsen.map(canoniekePlaats),
    wijken: [],
    typen: [],
    periode: 24,
    prijs: [...PRIJS_BEREIK],
    opp: [...OPP_BEREIK],
    bouwjaar: [...BOUWJAAR_BEREIK],
    energielabels: [],
    kamers: 0,
    perceel: [...PERCEEL_BEREIK],
    tuin: false,
    garage: false,
    tov: 'alle',
    klasse: '',
    b: false,
    bPlaats: '',
    bGroep: 'alle',
  }
}

/** Alle `woningtype_sub`-waarden van een groep, voor segment B ("alle appartementen" e.d.) — bron: `woningtypeTaxonomie()`. */
export function subtypenVoorGroep(groep: string): string[] {
  return woningtypeTaxonomie().find(t => t.groep === groep)?.subs ?? []
}

/**
 * Bouwt het RPC-filter voor segment A (de hoofdselectie). `metKlasse = false`
 * laat de prijsklasse-crossfilter weg — nodig voor de verdeling-naar-
 * prijsklasse-RPC zelf, die anders de geselecteerde klasse zou wegfilteren
 * i.p.v. hem alleen visueel te markeren (zie `docs/ontwerp/marktanalyse.html`
 * `zonderKlasse`).
 */
export function filterStateNaarTransactieFilter(
  f: MarktanalyseFilterState,
  opts: { datumTot: string | null; metKlasse?: boolean },
): TransactieFilter {
  const { datumVan, datumTot } = periodeNaarDatums(f.periode, opts.datumTot)
  const filter: TransactieFilter = {}
  if (f.plaatsen.length) filter.plaatsen = f.plaatsen
  if (f.wijken.length) filter.wijken = f.wijken
  if (f.typen.length) filter.typen = f.typen
  if (datumVan) filter.datum_van = datumVan
  if (datumTot) filter.datum_tot = datumTot
  if (!bereikGelijk(f.opp, OPP_BEREIK)) { filter.opp_min = f.opp[0]; filter.opp_max = f.opp[1] }
  if (!bereikGelijk(f.bouwjaar, BOUWJAAR_BEREIK)) { filter.bouwjaar_min = f.bouwjaar[0]; filter.bouwjaar_max = f.bouwjaar[1] }
  if (f.energielabels.length) filter.energielabels = f.energielabels
  if (f.kamers) filter.kamers_min = f.kamers
  if (!bereikGelijk(f.perceel, PERCEEL_BEREIK)) { filter.perceel_min = f.perceel[0]; filter.perceel_max = f.perceel[1] }
  if (f.tuin) filter.tuin = true
  if (f.garage) filter.garage = true
  if (f.tov !== 'alle') filter.tov_vraagprijs = f.tov

  // Prijsschuiver + (optioneel) prijsklasse-crossfilter — intersectie, want
  // beide staan onafhankelijk van elkaar aan (docs/ontwerp/marktanalyse.html `inA`).
  let prijsMin = bereikGelijk(f.prijs, PRIJS_BEREIK) ? undefined : f.prijs[0]
  let prijsMax = bereikGelijk(f.prijs, PRIJS_BEREIK) ? undefined : f.prijs[1]
  if (opts.metKlasse !== false && f.klasse) {
    const k = prijsklasseFilter(f.klasse)
    prijsMin = Math.max(prijsMin ?? 0, k.prijs_min ?? 0)
    prijsMax = k.prijs_max != null ? Math.min(prijsMax ?? Infinity, k.prijs_max) : prijsMax
  }
  if (prijsMin != null) filter.prijs_min = prijsMin
  if (prijsMax != null && Number.isFinite(prijsMax)) filter.prijs_max = prijsMax

  return filter
}

/** Zelfde vertaling, maar voor `filterEigenRijen` (client-side "wij"-filtering, patroon 1). */
export function filterStateNaarEigenFilter(
  f: MarktanalyseFilterState,
  opts: { datumTot: string | null },
): MarktanalyseFilterV2 {
  const t = filterStateNaarTransactieFilter(f, opts)
  return {
    plaatsen: t.plaatsen ?? [],
    wijken: t.wijken ?? [],
    typen: t.typen ?? [],
    datumVan: t.datum_van,
    datumTot: t.datum_tot,
    prijsMin: t.prijs_min,
    prijsMax: t.prijs_max,
    oppMin: t.opp_min,
    oppMax: t.opp_max,
    bouwjaarMin: t.bouwjaar_min,
    bouwjaarMax: t.bouwjaar_max,
    energielabels: t.energielabels ?? [],
    kamersMin: t.kamers_min,
    perceelMin: t.perceel_min,
    perceelMax: t.perceel_max,
    tuin: t.tuin,
    garage: t.garage,
    tovVraagprijs: t.tov_vraagprijs,
  }
}

/** Segment B-filter: eigen plaats + optioneel typegroep, zelfde periode als segment A. `null` als segment B uit staat of geen plaats gekozen is. */
export function segmentBFilter(f: MarktanalyseFilterState, opts: { datumTot: string | null }): TransactieFilter | null {
  if (!f.b || !f.bPlaats) return null
  const { datumVan, datumTot } = periodeNaarDatums(f.periode, opts.datumTot)
  const filter: TransactieFilter = { plaatsen: [f.bPlaats] }
  if (datumVan) filter.datum_van = datumVan
  if (datumTot) filter.datum_tot = datumTot
  if (f.bGroep !== 'alle') {
    const subs = subtypenVoorGroep(f.bGroep)
    if (subs.length) filter.typen = subs
  }
  return filter
}

// ─────────────────────────────────────────────────────────────────────────
// F1: kerncijfers segment A vs. B (docs/architectuur.md § 1/7) — Segment B
// stond tot nu toe alleen als extra reeks in de grafieken; deze functie
// bouwt de compacte vergelijkingstabel onder de tegels (waarde A, waarde B,
// verschil B t.o.v. A). Puur, geen React — `components/SegmentVergelijking.tsx`
// formatteert de getallen (lib/opmaak.ts) en tekent de neutrale pijltjes.
// ─────────────────────────────────────────────────────────────────────────

export type SegmentVergelijkingMetriek = 'mediaanPrijs' | 'mediaanM2' | 'mediaanLooptijd' | 'pctTovVraag' | 'n'

/** Zelfde deltatype als de kerncijfer-tegels (tegelDefs in MarktanalyseExplorer): relatief (%) of absoluut (dagen/procentpunten). */
const SEGMENT_VERGELIJKING_DELTATYPE: Record<SegmentVergelijkingMetriek, 'relatief' | 'absoluut'> = {
  mediaanPrijs: 'relatief',
  mediaanM2: 'relatief',
  mediaanLooptijd: 'absoluut',
  pctTovVraag: 'absoluut',
  n: 'relatief',
}

export type SegmentVergelijkingRij = {
  metriek: SegmentVergelijkingMetriek
  deltaType: 'relatief' | 'absoluut'
  /** Waarde van segment A, `null` bij te weinig data (`teWeinigA`). */
  a: number | null
  /** Waarde van segment B, `null` bij te weinig data, ontbrekende data of een mislukte/nog niet afgeronde aanroep (`teWeinigB`). */
  b: number | null
  /** `berekenDelta(b, a, deltaType)` — B t.o.v. A, `null` zodra A of B te weinig data heeft. */
  verschil: number | null
  /** Aantal verkopen per segment — altijd getoond, ook bij te weinig data (docs/roadmap.md item F1: "Altijd n per segment"). */
  nA: number
  nB: number
  teWeinigA: boolean
  teWeinigB: boolean
}

/**
 * Bouwt de vijf vergelijkingsrijen (mediaan verkoopprijs, mediaan € per m²,
 * mediaan looptijd, t.o.v. vraagprijs, aantal verkopen) voor segment A vs. B.
 * `b = null` dekt zowel "segment B nog niet geladen" als "de aanroep is
 * mislukt" — in beide gevallen blijft segment A gewoon werken (`a` en
 * `teWeinigA` zijn onafhankelijk van `b`). Hergebruikt dezelfde
 * `berekenDelta` als de periode-delta in de kerncijfer-tegels, en dezelfde
 * `MIN_N_BETROUWBAAR`-drempel (docs/ontwerp/principes.md § Data).
 */
export function segmentVergelijking(
  a: MarktanalyseSamenvattingRij,
  b: MarktanalyseSamenvattingRij | null,
  minN: number = MIN_N_BETROUWBAAR,
): SegmentVergelijkingRij[] {
  const teWeinigA = a.n < minN
  const teWeinigB = !b || b.n < minN
  return (Object.keys(SEGMENT_VERGELIJKING_DELTATYPE) as SegmentVergelijkingMetriek[]).map(metriek => {
    const deltaType = SEGMENT_VERGELIJKING_DELTATYPE[metriek]
    const waardeA = metriek === 'n' ? a.n : a[metriek]
    const waardeB = b ? (metriek === 'n' ? b.n : b[metriek]) : null
    return {
      metriek,
      deltaType,
      a: teWeinigA ? null : waardeA,
      b: teWeinigB ? null : waardeB,
      verschil: teWeinigA || teWeinigB ? null : berekenDelta(waardeB, waardeA, deltaType),
      nA: a.n,
      nB: b?.n ?? 0,
      teWeinigA,
      teWeinigB,
    }
  })
}

// De vroegere `vorigePeriodeFilter()` — een client-side werk-around voor een
// bug in de RPC `marktanalyse_samenvatting` die `vorig.n` altijd op 0 hield
// zodra `p_filters` een `datum_van`/`datum_tot` bevatte — is verwijderd
// (27 sep 2026). De SQL-fix uit
// `20260924_fix_marktanalyse_samenvatting_vorige_periode.sql` is toegepast
// en geverifieerd tegen productie (`pg_get_functiondef` komt exact overeen
// met het migratiebestand): de RPC geeft `vorig` nu correct terug in de
// ene aanroep, dus de aanroepers (`app/(app)/marktanalyse/actions.ts`,
// `app/api/kwartaalbericht/route.ts`) gebruiken alleen nog
// `marktanalyseSamenvatting(client, filters)` en lezen `.huidig`/`.vorig`
// (incl. `.van`/`.tot`) rechtstreeks uit die ene respons.
