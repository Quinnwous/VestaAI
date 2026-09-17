/**
 * De enige plek in `app/`, `components/` en `lib/` die `transacties` of
 * `transacties_met_coordinaten` bevraagt, of een RPC op transactiedata
 * aanroept (item 2.2, docs/roadmap.md § 3.1 — bindend, afgedwongen door
 * `lib/transactiesQuery.guard.test.ts`). `app/admin/transacties/*` en
 * `scripts/` zijn uitgezonderd (platform-admin/service-role, buiten RLS).
 *
 * Drie toegangspatronen (§ 3.1):
 * 1. Eigen verkopen, compact, client-side (`haalEigenVerkopen`,
 *    `haalTransactiesVoorVerkenner`) — range-lus in blokken van 1.000,
 *    expliciete kolommen, `uitgesloten_reden is null`.
 * 2. Regionale dataset, geaggregeerd in Postgres — RPC's met één gedeelde
 *    `p_filters jsonb` (`TransactieFilterSchema`, lib/schemas.ts):
 *    `marktanalyseReeks`, `marktanalyseSamenvatting`, `concurrentieMarktaandeel`,
 *    `concurrentieSegmenten`, `zoekTransacties`, `prijsindexKwartaal`.
 * 3. Referenties op locatie: `referentiesInStraal` (ST_DWithin op `geo`).
 *
 * Elke functie neemt een sessie-gebonden Supabase-client (`createServerSupabaseClient()`)
 * als parameter, zodat RLS de kantoorscheiding regelt — nooit de service-client.
 *
 * Tussenfase (bewuste keuze, zie de opleverrapportage van item 2.2): de
 * verkenners (`MarktanalyseExplorer`, `ConcurrentieExplorer`,
 * `TransactiesZoeken`, `VerkoopkaartExplorer`) houden hun bestaande UI/props
 * en krijgen voorlopig de volledige, niet-uitgesloten rijenset via
 * `haalTransactiesVoorVerkenner` — dat lost het PostgREST-plafond van 1.000
 * rijen direct op. De RPC's hierboven zijn gebouwd, getest (vergelijking
 * tegen de pure functies) en < 300 ms op de fixture, maar worden pas in fase
 * 6 (visuele v2) in de pagina's zelf aangesloten.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { TransactieFilterSchema, type TransactieFilter } from './schemas'
import type { TransactieRow } from './supabase'
import type { createServerSupabaseClient } from './supabase'
import type { Kandidaat, Typegroep } from './waardering'
import { glad, type IndexPunt, type Kwartaal, type PrijsindexReeks } from './prijsindex'
import type { MarktaandeelPunt, SegmentWinnaar } from './concurrentie'

/** Sessie-gebonden Supabase-client (RLS actief) — nooit de service-client. */
export type SessieClient = ReturnType<typeof createServerSupabaseClient> | SupabaseClient

const BLOK = 1000

type Blokresultaat<T> = { data: T[] | null; error: { message: string } | null }

/**
 * Haalt alle rijen op via een `.range()`-lus in blokken van 1.000
 * (PostgREST-limiet). `haalBlok` geeft de ongetypeerde Supabase-builder
 * terug (het resultaat van `.select(kolommen.join(','))` op een client
 * zonder `Database`-generic is niet statisch te typeren op de kolomlijst) —
 * de cast naar `Blokresultaat<T>` gebeurt hier, één keer, na het awaiten.
 */
async function rangeLus<T>(haalBlok: (van: number, tot: number) => PromiseLike<unknown>): Promise<T[]> {
  const alles: T[] = []
  let van = 0
  for (;;) {
    const tot = van + BLOK - 1
    const ruw = await haalBlok(van, tot)
    const { data, error } = ruw as Blokresultaat<T>
    if (error) throw new Error(`transactiesQuery: ${error.message}`)
    const rijen = data ?? []
    alles.push(...rijen)
    if (rijen.length < BLOK) break
    van += BLOK
  }
  return alles
}

function isoDag(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Alle kolommen van `transacties` (behalve `geo` zelf) — komt overeen met `TransactieRow` in lib/supabase.ts. */
export const ALLE_TRANSACTIE_KOLOMMEN = [
  'id', 'kantoor_id', 'adres', 'postcode', 'plaats', 'wijk', 'buurt',
  'verkoopprijs', 'vraagprijs', 'verkoopdatum', 'looptijd_dagen', 'woningtype',
  'woonoppervlak_m2', 'perceel_m2', 'inhoud_m3', 'bouwjaar', 'energielabel', 'kamers',
  'garage', 'tuin', 'buitenruimte', 'eigen_verkoop', 'verkopend_kantoor', 'created_at',
  'bron', 'import_id', 'adres_sleutel', 'huisnummer', 'toevoeging',
  'woningtype_groep', 'woningtype_sub', 'geocode_status', 'uitgesloten_reden',
  'aankopend_kantoor', 'verkopend_kantoor_norm', 'prijs_m2',
] as const

/** `ALLE_TRANSACTIE_KOLOMMEN` plus `lat`/`lng` — voor de view `transacties_met_coordinaten`. */
export const MET_COORDINATEN_KOLOMMEN = [...ALLE_TRANSACTIE_KOLOMMEN, 'lat', 'lng'] as const

// ─────────────────────────────────────────────────────────────────────────
// Patroon 1: eigen verkopen / volledige set, compact, client-side gefilterd
// ─────────────────────────────────────────────────────────────────────────

/**
 * Eigen verkopen (`eigen_verkoop = true`, `uitgesloten_reden is null`),
 * expliciete kolommen, range-lus. ±150 rijen/jaar → ruim binnen één blok in
 * de praktijk, maar de lus dekt ook een groter demo-/toekomstig kantoor.
 * `metCoordinaten` schakelt over naar de view `transacties_met_coordinaten`
 * (voor de verkoopkaart/straalpaneel, die lat/lng nodig hebben).
 */
export async function haalEigenVerkopen<T extends Record<string, unknown> = TransactieRow>(
  client: SessieClient,
  kolommen: readonly string[],
  opties: { metCoordinaten?: boolean } = {},
): Promise<T[]> {
  const tabel = opties.metCoordinaten ? 'transacties_met_coordinaten' : 'transacties'
  return rangeLus<T>((van, tot) =>
    client
      .from(tabel)
      .select(kolommen.join(','))
      .eq('eigen_verkoop', true)
      .is('uitgesloten_reden', null)
      .order('id', { ascending: true })
      .range(van, tot),
  )
}

/**
 * Alle (niet-uitgesloten) transacties van het kantoor, expliciete kolommen,
 * range-lus — de tussenfase-vervanging voor de kale `select('*')` in de
 * marktinzichten-pagina's (zie het bestandscommentaar hierboven). Geeft de
 * volledige set, ongefilterd op `eigen_verkoop`; de aanroepende component
 * filtert/aggregeert zelf client-side (bestaande pure functies in
 * `lib/marktanalyse.ts`/`lib/concurrentie.ts`).
 */
export async function haalTransactiesVoorVerkenner<T extends Record<string, unknown> = TransactieRow>(
  client: SessieClient,
  kolommen: readonly string[],
  opties: { metCoordinaten?: boolean } = {},
): Promise<T[]> {
  const tabel = opties.metCoordinaten ? 'transacties_met_coordinaten' : 'transacties'
  return rangeLus<T>((van, tot) =>
    client
      .from(tabel)
      .select(kolommen.join(','))
      .is('uitgesloten_reden', null)
      .order('id', { ascending: true })
      .range(van, tot),
  )
}

/**
 * Regionale set voor de waarderingskern (§ 3.3): alleen de kolommen die
 * `kenmerkEffectenV2()`/`grootteEffect()` nodig hebben, binnen werkgebied +
 * typegroep, laatste `maanden` (standaard 36) tot en met `totDatum`
 * (standaard vandaag). Geen aparte RPC — enkele duizenden rijen, gerekend in
 * de server action, zodat er één implementatie van de methode is (§ 3.1).
 */
export async function haalRegionaleSet(
  client: SessieClient,
  werkgebied: string[],
  typegroep: Typegroep,
  opties: { totDatum?: string; maanden?: number } = {},
): Promise<Kandidaat[]> {
  const tot = opties.totDatum ?? isoDag(new Date())
  const maanden = opties.maanden ?? 36
  const vanaf = new Date(tot)
  vanaf.setUTCMonth(vanaf.getUTCMonth() - maanden)
  const kolommen = [
    'id', 'adres', 'plaats', 'woningtype_groep', 'woningtype_sub',
    'verkoopprijs', 'woonoppervlak_m2', 'bouwjaar', 'verkoopdatum',
    'garage', 'tuin', 'energielabel', 'verkopend_kantoor',
  ] as const

  if (werkgebied.length === 0) return []

  return rangeLus<Kandidaat>((van, tot2) =>
    client
      .from('transacties')
      .select(kolommen.join(','))
      .is('uitgesloten_reden', null)
      .eq('woningtype_groep', typegroep)
      .in('plaats', werkgebied)
      .gte('verkoopdatum', isoDag(vanaf))
      .lte('verkoopdatum', tot)
      .order('id', { ascending: true })
      .range(van, tot2),
  )
}

export type DataTotEnMet = {
  laatsteVerkoopdatum: string | null
  laatsteImportKlaarOp: string | null
}

/** Max. verkoopdatum in de dataset + de laatste geslaagde importdatum ("data t/m…" in de UI). */
export async function dataTotEnMet(client: SessieClient): Promise<DataTotEnMet> {
  const [{ data: maxDatum }, { data: laatsteImport }] = await Promise.all([
    client
      .from('transacties')
      .select('verkoopdatum')
      .is('uitgesloten_reden', null)
      .not('verkoopdatum', 'is', null)
      .order('verkoopdatum', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('imports')
      .select('klaar_op')
      .eq('status', 'klaar')
      .not('klaar_op', 'is', null)
      .order('klaar_op', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  return {
    laatsteVerkoopdatum: (maxDatum as { verkoopdatum: string | null } | null)?.verkoopdatum ?? null,
    laatsteImportKlaarOp: (laatsteImport as { klaar_op: string | null } | null)?.klaar_op ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Patroon 2: regionale dataset, geaggregeerd in Postgres (RPC's, § 3.1)
// ─────────────────────────────────────────────────────────────────────────

function metFilters(filters: TransactieFilter | undefined): TransactieFilter {
  return TransactieFilterSchema.parse(filters ?? {})
}

export type MarktanalyseReeksRij = {
  kwartaal: string
  n: number
  mediaanPrijs: number | null
  mediaanM2: number | null
  mediaanLooptijd: number | null
  pctTovVraag: number | null
}

type MarktanalyseReeksRpcRij = {
  kwartaal: string
  n: number
  mediaan_prijs: number | null
  mediaan_m2: number | null
  mediaan_looptijd: number | null
  pct_tov_vraag: number | null
}

/** RPC `marktanalyse_reeks` — kwartaalrijen, referentie-implementatie: lib/marktanalyse.ts naarKwartaalReeks(). */
export async function marktanalyseReeks(client: SessieClient, filters?: TransactieFilter): Promise<MarktanalyseReeksRij[]> {
  const { data, error } = await client.rpc('marktanalyse_reeks', { p_filters: metFilters(filters) })
  if (error) throw new Error(`marktanalyseReeks: ${error.message}`)
  return ((data ?? []) as MarktanalyseReeksRpcRij[]).map(r => ({
    kwartaal: r.kwartaal,
    n: r.n,
    mediaanPrijs: r.mediaan_prijs,
    mediaanM2: r.mediaan_m2,
    mediaanLooptijd: r.mediaan_looptijd,
    pctTovVraag: r.pct_tov_vraag,
  }))
}

export type MarktanalyseSamenvattingRij = {
  van: string | null
  tot: string | null
  n: number
  mediaanPrijs: number | null
  mediaanM2: number | null
  mediaanLooptijd: number | null
  pctTovVraag: number | null
}

export type MarktanalyseSamenvatting = {
  huidig: MarktanalyseSamenvattingRij
  vorig: MarktanalyseSamenvattingRij
}

type MarktanalyseSamenvattingRpcRij = {
  periode: 'huidig' | 'vorig'
  van: string | null
  tot: string | null
  n: number
  mediaan_prijs: number | null
  mediaan_m2: number | null
  mediaan_looptijd: number | null
  pct_tov_vraag: number | null
}

const LEGE_SAMENVATTING_RIJ: MarktanalyseSamenvattingRij = {
  van: null, tot: null, n: 0, mediaanPrijs: null, mediaanM2: null, mediaanLooptijd: null, pctTovVraag: null,
}

/** RPC `marktanalyse_samenvatting` — huidige periode + vorige periode (voor de delta). */
export async function marktanalyseSamenvatting(client: SessieClient, filters?: TransactieFilter): Promise<MarktanalyseSamenvatting> {
  const { data, error } = await client.rpc('marktanalyse_samenvatting', { p_filters: metFilters(filters) })
  if (error) throw new Error(`marktanalyseSamenvatting: ${error.message}`)
  const rijen = (data ?? []) as MarktanalyseSamenvattingRpcRij[]
  const naar = (r?: MarktanalyseSamenvattingRpcRij): MarktanalyseSamenvattingRij =>
    r
      ? { van: r.van, tot: r.tot, n: r.n, mediaanPrijs: r.mediaan_prijs, mediaanM2: r.mediaan_m2, mediaanLooptijd: r.mediaan_looptijd, pctTovVraag: r.pct_tov_vraag }
      : LEGE_SAMENVATTING_RIJ
  return {
    huidig: naar(rijen.find(r => r.periode === 'huidig')),
    vorig: naar(rijen.find(r => r.periode === 'vorig')),
  }
}

type ConcurrentieMarktaandeelRpcRij = { kantoor: string; aantal: number; aandeel_pct: number }

/** RPC `concurrentie_marktaandeel` — referentie-implementatie: lib/concurrentie.ts marktaandeel(). */
export async function concurrentieMarktaandeel(client: SessieClient, filters?: TransactieFilter): Promise<MarktaandeelPunt[]> {
  const { data, error } = await client.rpc('concurrentie_marktaandeel', { p_filters: metFilters(filters) })
  if (error) throw new Error(`concurrentieMarktaandeel: ${error.message}`)
  return ((data ?? []) as ConcurrentieMarktaandeelRpcRij[]).map(r => ({ kantoor: r.kantoor, aantal: r.aantal, aandeelPct: r.aandeel_pct }))
}

/** RPC `concurrentie_segmenten` — referentie-implementatie: lib/concurrentie.ts wieWintWelkSegment(). */
export async function concurrentieSegmenten(client: SessieClient, filters?: TransactieFilter): Promise<SegmentWinnaar[]> {
  const { data, error } = await client.rpc('concurrentie_segmenten', { p_filters: metFilters(filters) })
  if (error) throw new Error(`concurrentieSegmenten: ${error.message}`)
  return (data ?? []) as SegmentWinnaar[]
}

export type Sortering =
  | 'verkoopdatum_desc' | 'verkoopdatum_asc'
  | 'prijs_desc' | 'prijs_asc'
  | 'looptijd_desc' | 'looptijd_asc'

export type ZoekTransactiesResultaat = { rijen: TransactieRow[]; totaal: number }

/** RPC `transacties_zoeken` — gepagineerd + gesorteerd, geeft ook het totaal mee (voorbij de PostgREST-limiet van 1.000). */
export async function zoekTransacties(
  client: SessieClient,
  filters: TransactieFilter | undefined,
  opties: { sortering?: Sortering; limiet?: number; offset?: number } = {},
): Promise<ZoekTransactiesResultaat> {
  const { data, error } = await client.rpc('transacties_zoeken', {
    p_filters: metFilters(filters),
    p_sortering: opties.sortering ?? 'verkoopdatum_desc',
    p_limiet: opties.limiet ?? 50,
    p_offset: opties.offset ?? 0,
  })
  if (error) throw new Error(`zoekTransacties: ${error.message}`)
  const resultaat = (data ?? { totaal: 0, rijen: [] }) as { totaal: number; rijen: TransactieRow[] }
  return { rijen: resultaat.rijen ?? [], totaal: resultaat.totaal ?? 0 }
}

type PrijsindexRpcRij = { kwartaal: string; n: number; mediaan_m2: number | null }

/**
 * RPC `prijsindex_kwartaal` — mediaan €/m² per kwartaal (vóór het
 * gladstrijken), daarna client-side dezelfde `glad()` als `bouwIndex()`
 * intern gebruikt (lib/prijsindex.ts) — zo blijft er één smoothing-implementatie.
 */
export async function prijsindexKwartaal(
  client: SessieClient,
  filters: TransactieFilter | undefined,
  opties: { minN?: number; venster?: number } = {},
): Promise<PrijsindexReeks> {
  const { data, error } = await client.rpc('prijsindex_kwartaal', { p_filters: metFilters(filters) })
  if (error) throw new Error(`prijsindexKwartaal: ${error.message}`)
  const ruw = ((data ?? []) as PrijsindexRpcRij[]).map(r => ({ kwartaal: r.kwartaal as Kwartaal, n: r.n, mediaanM2: r.mediaan_m2 }))
  const punten: IndexPunt[] = glad(ruw, opties)
  return { punten, minN: opties.minN ?? 30, venster: opties.venster ?? 3 }
}

// ─────────────────────────────────────────────────────────────────────────
// Patroon 3: referenties op locatie (ST_DWithin)
// ─────────────────────────────────────────────────────────────────────────

/** RPC `referenties_in_straal` — kandidaten voor de waardering, vorm gelijk aan `Kandidaat` (lib/waardering.ts). */
export async function referentiesInStraal(
  client: SessieClient,
  opties: { lat: number; lng: number; straalM: number; filters?: TransactieFilter },
): Promise<Kandidaat[]> {
  const { data, error } = await client.rpc('referenties_in_straal', {
    p_lat: opties.lat,
    p_lng: opties.lng,
    p_straal_m: opties.straalM,
    p_filters: metFilters(opties.filters),
  })
  if (error) throw new Error(`referentiesInStraal: ${error.message}`)
  return (data ?? []) as Kandidaat[]
}
