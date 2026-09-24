import { z } from 'zod'
import {
  PRIJS_BEREIK, OPP_BEREIK, BOUWJAAR_BEREIK, PERCEEL_BEREIK,
  periodeNaarDatums, filterEigenRijen, type MarktanalyseFilterV2,
} from './marktanalyse'
import type { TransactieFilter } from './schemas'
import type { TransactieRow } from './supabase'
import type { Sortering } from './transactiesQuery'

/**
 * Pure logica voor "Transacties opzoeken v2" (item 6.2, docs/roadmap.md § 5
 * Fase 6 — port van `docs/ontwerp/transacties.html`). Zelfde patroon als
 * `lib/marktanalyse.ts` `filterStateNaarTransactieFilter` (item 6.1, het
 * sjabloon voor deze conversie) — hier hergebruikt via import i.p.v.
 * gedupliceerd: de bereiken (`PRIJS_BEREIK` e.a.), `periodeNaarDatums()` en
 * `filterEigenRijen()` komen uit `lib/marktanalyse.ts`.
 *
 * ⚠️ Afwijking van het prototype: `docs/ontwerp/transacties.html` heeft een
 * "Verkocht door"-dropdown die ook op individuele eigen makelaars filtert
 * (lokaal verzonnen `KANTOREN`/`TEAM`-data, zie de kop-comment van dat
 * bestand). `transacties` heeft geen makelaar-kolom (zie het commentaar bij
 * `transacties_gefilterd()` in supabase/migrations/20260917_rpc_transacties.sql)
 * — deze v2 heeft daarom alleen de "Alleen eigen verkopen"-schakelaar
 * (`alleenEigen`, bestaand `TransactieFilterSchema`-veld `alleen_eigen`). Een
 * per-kantoor "verkocht door"-filter hoort bij 6.3 (concurrentie, werkt op
 * `verkopend_kantoor_norm`).
 */

export const PER_PAGINA = 50
export const LOOPTIJD_MAX_STANDAARD = 365

export const TransactiesFilterSchema = z.object({
  plaatsen: z.array(z.string()),
  wijken: z.array(z.string()),
  typen: z.array(z.string()),
  periode: z.union([z.literal(12), z.literal(24), z.literal(36), z.literal(0)]),
  /** Aangepaste periode (yyyy-mm-dd) — overschrijft `periode` zodra gezet, net als in het prototype. */
  datumVan: z.string(),
  datumTot: z.string(),
  prijs: z.tuple([z.number(), z.number()]),
  opp: z.tuple([z.number(), z.number()]),
  bouwjaar: z.tuple([z.number(), z.number()]),
  energielabels: z.array(z.string()),
  kamers: z.number(),
  perceel: z.tuple([z.number(), z.number()]),
  tuin: z.boolean(),
  garage: z.boolean(),
  tov: z.enum(['alle', 'boven', 'op_of_onder']),
  looptijdMax: z.number(),
  alleenEigen: z.boolean(),
  zoek: z.string(),
  sortKey: z.string(),
  sortDir: z.enum(['asc', 'desc']),
  pagina: z.number(),
})
export type TransactiesFilterState = z.infer<typeof TransactiesFilterSchema>

/** Standaardfilter = werkgebied van het kantoor, zelfde als de marktanalyse-explorer. */
export function standaardTransactiesFilterState(werkgebiedPlaatsen: string[]): TransactiesFilterState {
  return {
    plaatsen: werkgebiedPlaatsen,
    wijken: [],
    typen: [],
    periode: 24,
    datumVan: '',
    datumTot: '',
    prijs: [...PRIJS_BEREIK],
    opp: [...OPP_BEREIK],
    bouwjaar: [...BOUWJAAR_BEREIK],
    energielabels: [],
    kamers: 0,
    perceel: [...PERCEEL_BEREIK],
    tuin: false,
    garage: false,
    tov: 'alle',
    looptijdMax: LOOPTIJD_MAX_STANDAARD,
    alleenEigen: false,
    zoek: '',
    sortKey: 'verkoopdatum',
    sortDir: 'desc',
    pagina: 1,
  }
}

function bereikGelijk(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

/**
 * Filterstaat → `TransactieFilter` voor de RPC `transacties_zoeken` (patroon 2,
 * docs/roadmap.md § 3.1). Een handmatig datumbereik (`datumVan`/`datumTot`)
 * overschrijft de periode-preset — "Aangepaste periode overschrijft de
 * snelkeuze" in `docs/ontwerp/transacties.html`.
 */
export function transactiesFilterNaarTransactieFilter(
  f: TransactiesFilterState,
  opts: { datumTot: string | null },
): TransactieFilter {
  const filter: TransactieFilter = {}

  if (f.datumVan || f.datumTot) {
    if (f.datumVan) filter.datum_van = f.datumVan
    if (f.datumTot) filter.datum_tot = f.datumTot
  } else {
    const { datumVan, datumTot } = periodeNaarDatums(f.periode, opts.datumTot)
    if (datumVan) filter.datum_van = datumVan
    if (datumTot) filter.datum_tot = datumTot
  }

  if (f.plaatsen.length) filter.plaatsen = f.plaatsen
  if (f.wijken.length) filter.wijken = f.wijken
  if (f.typen.length) filter.typen = f.typen
  if (!bereikGelijk(f.prijs, PRIJS_BEREIK)) {
    filter.prijs_min = f.prijs[0]
    if (f.prijs[1] < PRIJS_BEREIK[1]) filter.prijs_max = f.prijs[1]
  }
  if (!bereikGelijk(f.opp, OPP_BEREIK)) {
    filter.opp_min = f.opp[0]
    if (f.opp[1] < OPP_BEREIK[1]) filter.opp_max = f.opp[1]
  }
  if (!bereikGelijk(f.bouwjaar, BOUWJAAR_BEREIK)) {
    filter.bouwjaar_min = f.bouwjaar[0]
    filter.bouwjaar_max = f.bouwjaar[1]
  }
  if (f.energielabels.length) filter.energielabels = f.energielabels
  if (f.kamers) filter.kamers_min = f.kamers
  if (!bereikGelijk(f.perceel, PERCEEL_BEREIK)) {
    filter.perceel_min = f.perceel[0]
    if (f.perceel[1] < PERCEEL_BEREIK[1]) filter.perceel_max = f.perceel[1]
  }
  if (f.tuin) filter.tuin = true
  if (f.garage) filter.garage = true
  if (f.tov !== 'alle') filter.tov_vraagprijs = f.tov
  if (f.looptijdMax < LOOPTIJD_MAX_STANDAARD) filter.looptijd_max = f.looptijdMax
  if (f.alleenEigen) filter.alleen_eigen = true
  if (f.zoek.trim()) filter.zoek = f.zoek.trim()

  return filter
}

/** Zelfde vertaling, maar naar `MarktanalyseFilterV2` voor `filterEigenRijen()` (client-side, CSV-export). */
export function transactiesFilterNaarEigenFilter(
  f: TransactiesFilterState,
  opts: { datumTot: string | null },
): MarktanalyseFilterV2 {
  const t = transactiesFilterNaarTransactieFilter(f, opts)
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

/**
 * Filtert de (compacte, client-side aanwezige) eigen-verkopenset voor de
 * CSV-export — `haalEigenVerkopen()` haalt al alléén `eigen_verkoop = true`
 * op (§ 3.1 patroon 1), dus "CSV-export uitsluitend eigen verkopen" is al
 * gegarandeerd vóór dit filter draait. `filterEigenRijen()` (lib/marktanalyse.ts)
 * dekt niet `zoek`/`looptijdMax` — die twee worden hier na afloop toegepast,
 * zodat de export exact dezelfde selectie is als de zichtbare tabel.
 */
export function filtreerEigenVoorExport(
  rijen: TransactieRow[],
  f: TransactiesFilterState,
  opts: { datumTot: string | null },
): TransactieRow[] {
  const basis = filterEigenRijen(rijen, transactiesFilterNaarEigenFilter(f, opts))
  return basis.filter(r => {
    if (f.looptijdMax < LOOPTIJD_MAX_STANDAARD && (r.looptijd_dagen == null || r.looptijd_dagen > f.looptijdMax)) return false
    if (f.zoek.trim() && !r.adres.toLowerCase().includes(f.zoek.trim().toLowerCase())) return false
    return true
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Sortering — DataTable-kolomklik → RPC-sorteersleutel (Sortering, lib/transactiesQuery.ts)
// ─────────────────────────────────────────────────────────────────────────

/** DataTable-kolom-id's die een sorteerbare kop hebben, zie `components/TransactiesZoeken.tsx`. */
export const SORTEERBARE_KOLOMMEN = [
  'adres', 'plaatswijk', 'type', 'verkoopdatum', 'prijs', 'opp', 'm2', 'ratio', 'looptijd', 'verkochtDoor',
] as const
export type SorteerbareKolom = (typeof SORTEERBARE_KOLOMMEN)[number]

const KOLOM_NAAR_SORTERING: Record<SorteerbareKolom, { asc: Sortering; desc: Sortering }> = {
  adres: { asc: 'adres_asc', desc: 'adres_desc' },
  plaatswijk: { asc: 'plaats_asc', desc: 'plaats_desc' },
  type: { asc: 'type_asc', desc: 'type_desc' },
  verkoopdatum: { asc: 'verkoopdatum_asc', desc: 'verkoopdatum_desc' },
  prijs: { asc: 'prijs_asc', desc: 'prijs_desc' },
  opp: { asc: 'opp_asc', desc: 'opp_desc' },
  m2: { asc: 'm2_asc', desc: 'm2_desc' },
  ratio: { asc: 'ratio_asc', desc: 'ratio_desc' },
  looptijd: { asc: 'looptijd_asc', desc: 'looptijd_desc' },
  verkochtDoor: { asc: 'verkochtdoor_asc', desc: 'verkochtdoor_desc' },
}

/** Standaard sorteerrichting per kolom bij een eerste klik (prijs/looptijd/datum starten aflopend resp. oplopend, net als het prototype `dirDefault`). */
const STANDAARD_RICHTING: Record<SorteerbareKolom, 'asc' | 'desc'> = {
  adres: 'asc',
  plaatswijk: 'asc',
  type: 'asc',
  verkoopdatum: 'desc',
  prijs: 'desc',
  opp: 'desc',
  m2: 'desc',
  ratio: 'desc',
  looptijd: 'asc',
  verkochtDoor: 'asc',
}

export function isSorteerbareKolom(kolomId: string): kolomId is SorteerbareKolom {
  return (SORTEERBARE_KOLOMMEN as readonly string[]).includes(kolomId)
}

/** Volgende sorteerstand na een klik op kolomkop `kolomId` — toggelt de richting als het al de actieve kolom is, anders de standaardrichting van die kolom. */
export function volgendeSortering(
  huidig: { sortKey: string; sortDir: 'asc' | 'desc' },
  kolomId: SorteerbareKolom,
): { sortKey: string; sortDir: 'asc' | 'desc' } {
  if (huidig.sortKey === kolomId) return { sortKey: kolomId, sortDir: huidig.sortDir === 'asc' ? 'desc' : 'asc' }
  return { sortKey: kolomId, sortDir: STANDAARD_RICHTING[kolomId] }
}

/** `{ sortKey, sortDir }` (URL-staat) → `Sortering` voor `zoekTransacties()`. Onbekende sleutel valt terug op `verkoopdatum_desc`. */
export function sorteringVoorRpc(sortKey: string, sortDir: 'asc' | 'desc'): Sortering {
  if (isSorteerbareKolom(sortKey)) return KOLOM_NAAR_SORTERING[sortKey][sortDir]
  return 'verkoopdatum_desc'
}

// ─────────────────────────────────────────────────────────────────────────
// "Verkocht door" — weergave (geen makelaar-kolom, zie het bestandscommentaar)
// ─────────────────────────────────────────────────────────────────────────

/** `(verkoopprijs - vraagprijs) / vraagprijs * 100` — `null` zonder prijs/vraagprijs of bij `vraagprijs = 0`. Zelfde formule als `lib/marktanalyse.ts` `wijKwartaalReeks()`/`filterEigenRijen()`. */
export function ratioTovVraagprijs(rij: Pick<TransactieRow, 'verkoopprijs' | 'vraagprijs'>): number | null {
  if (rij.verkoopprijs == null || rij.vraagprijs == null || rij.vraagprijs === 0) return null
  return ((rij.verkoopprijs - rij.vraagprijs) / rij.vraagprijs) * 100
}

export function verkochtDoorLabel(
  rij: Pick<TransactieRow, 'eigen_verkoop' | 'verkopend_kantoor_norm' | 'verkopend_kantoor'>,
  eigenKantoorNaam: string,
): string {
  if (rij.eigen_verkoop) return eigenKantoorNaam
  // Toon de ruwe naam ('Wassenaar Makelaars'); _norm is de kleine-letter-groeperingssleutel.
  return rij.verkopend_kantoor ?? rij.verkopend_kantoor_norm ?? 'Onbekend'
}

// ─────────────────────────────────────────────────────────────────────────
// CSV-export (client-side, uitsluitend eigen verkopen — item 6.2)
// ─────────────────────────────────────────────────────────────────────────

const CSV_KOLOMMEN: { key: keyof TransactieRow; header: string }[] = [
  { key: 'adres', header: 'Adres' },
  { key: 'postcode', header: 'Postcode' },
  { key: 'plaats', header: 'Plaats' },
  { key: 'wijk', header: 'Wijk' },
  { key: 'woningtype_sub', header: 'Type' },
  { key: 'verkoopdatum', header: 'Verkoopdatum' },
  { key: 'verkoopprijs', header: 'Verkoopprijs' },
  { key: 'vraagprijs', header: 'Vraagprijs' },
  { key: 'woonoppervlak_m2', header: 'Woonoppervlak (m2)' },
  { key: 'perceel_m2', header: 'Perceel (m2)' },
  { key: 'prijs_m2', header: 'Prijs per m2' },
  { key: 'looptijd_dagen', header: 'Looptijd (dagen)' },
  { key: 'bouwjaar', header: 'Bouwjaar' },
  { key: 'energielabel', header: 'Energielabel' },
  { key: 'kamers', header: 'Kamers' },
  { key: 'tuin', header: 'Tuin' },
  { key: 'garage', header: 'Garage' },
]

function csvVeld(waarde: unknown): string {
  if (waarde == null) return ''
  const tekst = typeof waarde === 'boolean' ? (waarde ? 'Ja' : 'Nee') : String(waarde)
  if (/[";\n]/.test(tekst)) return '"' + tekst.replace(/"/g, '""') + '"'
  return tekst
}

/** `;`-gescheiden CSV (Nederlandse Excel-standaard) — kopregel + één rij per transactie. */
export function bouwTransactiesCsv(rijen: TransactieRow[]): string {
  const kop = CSV_KOLOMMEN.map(k => k.header).join(';')
  const regels = rijen.map(r => CSV_KOLOMMEN.map(k => csvVeld(r[k.key])).join(';'))
  return [kop, ...regels].join('\r\n')
}
