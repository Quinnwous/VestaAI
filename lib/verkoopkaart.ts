import { z } from 'zod'
import type { TransactieRow } from './supabase'
import { gemiddelde } from './utils'
import { mediaan, kwartaalVan, kwartaalNummer, kwartaalUitNummer, kwartalenTussen, type Kwartaal } from './prijsindex'
import { MIN_N_VOOR_GEMIDDELDE } from './kerncijfers'
import { filterEigenRijen, PRIJS_BEREIK, OPP_BEREIK, BOUWJAAR_BEREIK, type MarktanalyseFilterV2 } from './marktanalyse'

/**
 * Pure filter-/sorteer-/kerncijferlogica voor de verkoopkaart-explorer v2
 * (item 7.2, docs/roadmap.md § 5 Fase 7 — port van
 * `docs/ontwerp/verkoopkaart.html`, spec: `docs/ontwerp/README.md`). Los van
 * React/Supabase, zodat hij met vitest te testen is — zie
 * `verkoopkaart.test.ts`.
 *
 * Filtert client-side op de eigen-verkopenreeks (§ 3.1 patroon 1, al
 * opgehaald via `haalEigenVerkopen`/`MET_COORDINATEN_KOLOMMEN`): hergebruikt
 * `filterEigenRijen`/`PRIJS_BEREIK`/`OPP_BEREIK`/`BOUWJAAR_BEREIK` uit
 * `lib/marktanalyse.ts` zodat er precies één implementatie van "wat is een
 * match" bestaat tussen de twee explorers. De tijdlijn (kwartaal-schuiver met
 * afspeelknop, i.p.v. de vaste 12/24/36/alles-periodes van Marktanalyse) is
 * hier eigen: `van`/`tot` zijn doorlopende kwartaalnummers
 * (`lib/prijsindex.ts` `kwartaalNummer`), omgezet naar een datum-bereik voor
 * `filterEigenRijen`.
 *
 * ⚠️ "Verkocht door" (teamlid) staat in het filtermodel
 * (docs/ontwerp/README.md § 4) maar `transacties` heeft geen makelaar-kolom
 * — zelfde open actie als bij Marktanalyse/Transacties (zie
 * `lib/schemas.ts` bovenaan `TransactieFilterSchema`). Bewust niet
 * geïmplementeerd hier; zie de opleverrapportage van item 7.2 en de additieve
 * migratie in `supabase/migrations/`.
 */

// ─────────────────────────────────────────────────────────────────────────
// Tijdlijn: doorlopende kwartaalnummers ↔ datum-bereik
// ─────────────────────────────────────────────────────────────────────────

function eersteDagVanKwartaal(k: Kwartaal): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(k)
  if (!m) throw new Error(`Ongeldig kwartaal: ${k}`)
  const jaar = Number(m[1])
  const maand = (Number(m[2]) - 1) * 3
  return new Date(Date.UTC(jaar, maand, 1)).toISOString().slice(0, 10)
}

function laatsteDagVanKwartaal(k: Kwartaal): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(k)
  if (!m) throw new Error(`Ongeldig kwartaal: ${k}`)
  const jaar = Number(m[1])
  const maandNaKwartaal = Number(m[2]) * 3 // 0-indexed eerste maand van het volgende kwartaal
  // Dag 0 van die maand = de laatste dag van de voorgaande (= dit kwartaal).
  return new Date(Date.UTC(jaar, maandNaKwartaal, 0)).toISOString().slice(0, 10)
}

/** Kwartaalnummer-bereik → `{ datumVan, datumTot }` (ISO, inclusief) voor `filterEigenRijen`. */
export function tijdlijnFilterDatums(van: number, tot: number): { datumVan: string; datumTot: string } {
  return {
    datumVan: eersteDagVanKwartaal(kwartaalUitNummer(van)),
    datumTot: laatsteDagVanKwartaal(kwartaalUitNummer(tot)),
  }
}

export type VerkoopdatumRow = { verkoopdatum: string | null }

/**
 * Kwartaalbereik van de dataset (min/max `verkoopdatum`), voor de
 * standaardstand van de tijdlijn. Bij een lege set (nieuw kantoor, nog geen
 * import) valt hij terug op `referentieDatum` (server-berekend, bv.
 * `dataTotEnMet`) of anders een vaste datum — nooit `new Date()` hier: deze
 * functie draait ook in de clientcomponent, en CLAUDE.md verbiedt
 * omgevingsafhankelijke klok-aanroepen daar (hydratierisico, les 19 sep 2026).
 */
export function kwartaalBereikUitRijen(rijen: VerkoopdatumRow[], referentieDatum: string | null = null): { van: number; tot: number } {
  const datums = rijen.map(r => r.verkoopdatum).filter((d): d is string => !!d)
  if (datums.length === 0) {
    const n = kwartaalNummer(kwartaalVan(referentieDatum ?? '2024-01-01'))
    return { van: n, tot: n }
  }
  const nummers = datums.map(d => kwartaalNummer(kwartaalVan(d)))
  return { van: Math.min(...nummers), tot: Math.max(...nummers) }
}

// ─────────────────────────────────────────────────────────────────────────
// Filterstaat (useFilterState) → MarktanalyseFilterV2
// ─────────────────────────────────────────────────────────────────────────

export const VerkoopkaartFilterSchema = z.object({
  typen: z.array(z.string()),
  prijs: z.tuple([z.number(), z.number()]),
  opp: z.tuple([z.number(), z.number()]),
  bouwjaar: z.tuple([z.number(), z.number()]),
  energielabels: z.array(z.string()),
  kamers: z.number(),
  tuin: z.boolean(),
  garage: z.boolean(),
  van: z.number(),
  tot: z.number(),
  sort: z.enum(['datum', 'prijs', 'looptijd']),
})
export type VerkoopkaartFilterState = z.infer<typeof VerkoopkaartFilterSchema>

/** Standaardfilter: hele tijdlijn van de dataset, verder niets actief (docs/ontwerp/verkoopkaart.html `std()`). */
export function standaardVerkoopkaartFilter(vanKwartaal: number, totKwartaal: number): VerkoopkaartFilterState {
  return {
    typen: [],
    prijs: [...PRIJS_BEREIK],
    opp: [...OPP_BEREIK],
    bouwjaar: [...BOUWJAAR_BEREIK],
    energielabels: [],
    kamers: 0,
    tuin: false,
    garage: false,
    van: vanKwartaal,
    tot: totKwartaal,
    sort: 'datum',
  }
}

function bereikGelijk(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

/** Vertaalt de verkoopkaart-filterstaat naar `MarktanalyseFilterV2` voor `filterEigenRijen` (§ 3.1 patroon 1). */
export function verkoopkaartFilterNaarEigenFilter(f: VerkoopkaartFilterState): MarktanalyseFilterV2 {
  const { datumVan, datumTot } = tijdlijnFilterDatums(f.van, f.tot)
  return {
    plaatsen: [],
    wijken: [],
    typen: f.typen,
    datumVan,
    datumTot,
    prijsMin: bereikGelijk(f.prijs, PRIJS_BEREIK) ? undefined : f.prijs[0],
    prijsMax: bereikGelijk(f.prijs, PRIJS_BEREIK) ? undefined : f.prijs[1],
    oppMin: bereikGelijk(f.opp, OPP_BEREIK) ? undefined : f.opp[0],
    oppMax: bereikGelijk(f.opp, OPP_BEREIK) ? undefined : f.opp[1],
    bouwjaarMin: bereikGelijk(f.bouwjaar, BOUWJAAR_BEREIK) ? undefined : f.bouwjaar[0],
    bouwjaarMax: bereikGelijk(f.bouwjaar, BOUWJAAR_BEREIK) ? undefined : f.bouwjaar[1],
    energielabels: f.energielabels,
    kamersMin: f.kamers || undefined,
    tuin: f.tuin || undefined,
    garage: f.garage || undefined,
  }
}

/** Filtert de eigen-verkopenreeks — dunne wrapper om `filterEigenRijen` met de verkoopkaart-specifieke vertaling. */
export function filterVerkoopkaartRijen<T extends TransactieRow>(rijen: T[], f: VerkoopkaartFilterState): T[] {
  return filterEigenRijen(rijen, verkoopkaartFilterNaarEigenFilter(f)) as T[]
}

export { PRIJS_BEREIK, OPP_BEREIK, BOUWJAAR_BEREIK }

// ─────────────────────────────────────────────────────────────────────────
// Kerncijfers "in beeld" (hero-tegel + 4 tegels, docs/ontwerp/verkoopkaart.html)
// ─────────────────────────────────────────────────────────────────────────

export type VerkoopkaartKerncijfers = {
  n: number
  mediaanPrijs: number | null
  mediaanM2: number | null
  gemLooptijd: number | null
  /** % van de verkopen boven de vraagprijs; `null` zonder vergelijkbare rijen (geen vraagprijs bekend). */
  pctBovenVraagprijs: number | null
}

/** Onder dit aantal toont de hero-tegel een amberkleurige waarschuwing i.p.v. de kerncijfers (docs/ontwerp/README.md § 7 "weinig data"). */
export const MIN_N_KERNCIJFERS = MIN_N_VOOR_GEMIDDELDE

export function berekenVerkoopkaartKerncijfers(rijen: TransactieRow[]): VerkoopkaartKerncijfers {
  const prijzen = rijen.map(r => r.verkoopprijs).filter((v): v is number => v != null)
  const m2prijzen = rijen.map(r => r.prijs_m2).filter((v): v is number => v != null)
  const looptijden = rijen.map(r => r.looptijd_dagen).filter((v): v is number => v != null)
  const metVraagprijs = rijen.filter((r): r is TransactieRow & { verkoopprijs: number; vraagprijs: number } => r.verkoopprijs != null && r.vraagprijs != null)
  const pctBovenVraagprijs = metVraagprijs.length
    ? Math.round((metVraagprijs.filter(r => r.verkoopprijs > r.vraagprijs).length / metVraagprijs.length) * 1000) / 10
    : null

  return {
    n: rijen.length,
    mediaanPrijs: mediaan(prijzen),
    mediaanM2: mediaan(m2prijzen),
    gemLooptijd: gemiddelde(looptijden, 0),
    pctBovenVraagprijs,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Per-kwartaal reeks voor de tegel-sparklines (binnen [van, tot])
// ─────────────────────────────────────────────────────────────────────────

export type VerkoopkaartSparklineReeks = {
  kwartalen: Kwartaal[]
  n: (number | null)[]
  prijs: (number | null)[]
  m2: (number | null)[]
  looptijd: (number | null)[]
  boven: (number | null)[]
}

/**
 * Groepeert een reeds gefilterde rijenset per kwartaal binnen `[van, tot]`
 * (poort van `sparkline(waarden)`-voeding in `docs/ontwerp/verkoopkaart.html`
 * `update()`) — mediaan voor prijs/m², gemiddelde voor looptijd, % voor
 * "boven vraagprijs", precies zoals `berekenVerkoopkaartKerncijfers` voor de
 * hele selectie. Lege kwartalen krijgen `null` (geen sparkline-punt), `n`
 * krijgt `0`.
 */
export function verkoopkaartSparklineReeks(rijen: TransactieRow[], van: number, tot: number): VerkoopkaartSparklineReeks {
  const kwartalen = kwartalenTussen(kwartaalUitNummer(van), kwartaalUitNummer(tot))
  const emmers = new Map<Kwartaal, TransactieRow[]>()
  for (const r of rijen) {
    if (!r.verkoopdatum) continue
    const k = kwartaalVan(r.verkoopdatum)
    const emmer = emmers.get(k)
    if (emmer) emmer.push(r)
    else emmers.set(k, [r])
  }
  const groepen = kwartalen.map(k => emmers.get(k) ?? [])
  return {
    kwartalen,
    n: groepen.map(g => g.length),
    prijs: groepen.map(g => mediaan(g.map(r => r.verkoopprijs).filter((v): v is number => v != null))),
    m2: groepen.map(g => mediaan(g.map(r => r.prijs_m2).filter((v): v is number => v != null))),
    looptijd: groepen.map(g => gemiddelde(g.map(r => r.looptijd_dagen).filter((v): v is number => v != null), 0)),
    boven: groepen.map(g => {
      const met = g.filter((r): r is TransactieRow & { verkoopprijs: number; vraagprijs: number } => r.verkoopprijs != null && r.vraagprijs != null)
      return met.length ? Math.round((met.filter(r => r.verkoopprijs > r.vraagprijs).length / met.length) * 1000) / 10 : null
    }),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Sorteren van de zijlijst (docs/ontwerp/README.md § 6: "sorteren datum/prijs/looptijd")
// ─────────────────────────────────────────────────────────────────────────

export type Verkoopsortering = 'datum' | 'prijs' | 'looptijd'

export type SorteerbareRow = { verkoopdatum: string | null; verkoopprijs: number | null; looptijd_dagen: number | null }

/** Datum: nieuwste eerst. Prijs: hoogste eerst. Looptijd: kortste eerst (poort van de segmented-sortering in het prototype). */
export function sorteerVerkopen<T extends SorteerbareRow>(rijen: T[], sort: Verkoopsortering): T[] {
  const gesorteerd = [...rijen]
  gesorteerd.sort((a, b) => {
    if (sort === 'prijs') return (b.verkoopprijs ?? -Infinity) - (a.verkoopprijs ?? -Infinity)
    if (sort === 'looptijd') return (a.looptijd_dagen ?? Infinity) - (b.looptijd_dagen ?? Infinity)
    return (b.verkoopdatum ?? '').localeCompare(a.verkoopdatum ?? '')
  })
  return gesorteerd
}
