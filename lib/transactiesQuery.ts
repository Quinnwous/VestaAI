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
 * ⚠️ Bijgewerkt 27 sep 2026 (item 12.3, performance): de tussenfase hierboven
 * beschreef de situatie van item 2.2 (17 sep) en was sindsdien stale. Fase 6
 * (6.1-6.3, 23-24 sep) heeft de verkenners al op de RPC's aangesloten:
 * `MarktanalyseExplorer`/`ConcurrentieExplorer`/`TransactiesZoeken` gebruiken
 * uitsluitend patroon 2 (RPC's, incl. `zoekTransacties`) voor hun hoofddata;
 * `VerkoopkaartExplorerV2`/de dossierkaart (`WaarderingKaart`) gebruiken patroon 1
 * (`haalEigenVerkopen`, want de kaart toont alléén eigen verkopen). Geen
 * levende aanroeper gebruikt `haalTransactiesVoorVerkenner` nog — die blijft
 * staan als referentie-implementatie voor `lib/transactiesQuery.rpc.test.ts`
 * (vergelijkt de RPC's tegen de pure range-lus) én als het fundament van de
 * in-memory terugval in `zoekTransacties()` hieronder (bij `PGRST202`, de
 * RPC ontbreekt op een omgeving zonder de migratie).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { TransactieFilterSchema, type TransactieFilter } from './schemas'
import type { TransactieRow } from './supabase'
import type { createServerSupabaseClient } from './supabase'
import type { Kandidaat, Typegroep } from './waardering'
import { glad, type IndexPunt, type Kwartaal, type PrijsindexReeks } from './prijsindex'
import type {
  MarktaandeelPunt, SegmentWinnaar,
  RanglijstRij, WijVsMarkt, AandeelJaarRij, MatrixCel, ConcurrentProfielV2,
} from './concurrentie'
import { filterEigenRijen, type MarktanalyseFilterV2 } from './marktanalyse'

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

/**
 * Referentiekandidaten op id (item 4.4, docs/roadmap.md § 3.3): lost de
 * opgeslagen `waardering_json.handmatig.toegevoegd`/`uitgesloten`-ids op naar
 * volledige `Kandidaat`-rijen — dezelfde kolommen als `haalRegionaleSet()`.
 * Geen coördinaten (die kolommen staan alleen op de view
 * `transacties_met_coordinaten`, niet op `transacties` zelf): een handmatig
 * toegevoegde referentie toont dus geen afstand tot het subject.
 */
export async function haalTransactiesOpId(client: SessieClient, ids: string[]): Promise<Kandidaat[]> {
  if (ids.length === 0) return []
  const kolommen = [
    'id', 'adres', 'plaats', 'woningtype_groep', 'woningtype_sub',
    'verkoopprijs', 'woonoppervlak_m2', 'bouwjaar', 'verkoopdatum',
    'garage', 'tuin', 'energielabel', 'verkopend_kantoor',
  ] as const
  const { data, error } = await client
    .from('transacties')
    .select(kolommen.join(','))
    .in('id', ids)
    .is('uitgesloten_reden', null)
  if (error) throw new Error(`haalTransactiesOpId: ${error.message}`)
  return (data ?? []) as unknown as Kandidaat[]
}

export type TransactieCoordinaat = { lat: number; lng: number } | null

/**
 * Coördinaat van precies één transactie (minikaart in de transactie-sheet,
 * docs/roadmap.md § 9 "Vóór de demo oppakken") — losse lookup op de view
 * `transacties_met_coordinaten`, alleen voor de rij die open staat in
 * `components/TransactiesZoeken.tsx`. `zoekTransacties()`/de RPC
 * `transacties_zoeken` zelf leveren geen lat/lng (die selecteert `t.*` op de
 * kale tabel `transacties`, die geen coördinaatkolommen heeft) — dat
 * uitbreiden zou de RPC wijzigen (migratie). Deze functie blijft binnen
 * `lib/transactiesQuery.ts` zonder schema-/RPC-wijziging: gewoon een
 * `select` op de bestaande, al toegepaste view, gefilterd op één id. `null`
 * als de transactie niet bestaat, niet geocodeerd is (`geocode_status`), of
 * buiten het eigen kantoor valt (RLS regelt dat vanzelf).
 */
export async function haalTransactieCoordinaat(client: SessieClient, id: string): Promise<TransactieCoordinaat> {
  const { data, error } = await client
    .from('transacties_met_coordinaten')
    .select('lat, lng')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`haalTransactieCoordinaat: ${error.message}`)
  const rij = data as { lat: number | null; lng: number | null } | null
  if (!rij || rij.lat == null || rij.lng == null) return null
  return { lat: rij.lat, lng: rij.lng }
}

/**
 * Coördinaten van een set referentie-id's tegelijk (locatiekaart in de
 * waardebepaling-pdf, item 4.7-uitbreiding § 9) — batchvariant van
 * `haalTransactieCoordinaat` op dezelfde view. `waardering_json.uitkomst.
 * referenties[].id` is 1-op-1 het `transacties.id` (zie `lib/waardering.ts`,
 * `id: r.id` in `berekenWaarderingV2`), dus de pdf-route kan hiermee de
 * opgeslagen referenties terugkoppelen aan een lat/lng zonder de
 * waardebepaling opnieuw te berekenen. Ontbrekende/niet-geocodeerde id's
 * staan simpelweg niet in de teruggegeven Map — de aanroeper laat die
 * referenties dan van de kaart vallen (`lib/statischeKaart.ts`
 * `kaartReferenties`).
 */
export async function haalTransactieCoordinaten(client: SessieClient, ids: string[]): Promise<Map<string, { lat: number; lng: number }>> {
  const resultaat = new Map<string, { lat: number; lng: number }>()
  if (ids.length === 0) return resultaat
  const { data, error } = await client
    .from('transacties_met_coordinaten')
    .select('id, lat, lng')
    .in('id', ids)
  if (error) throw new Error(`haalTransactieCoordinaten: ${error.message}`)
  for (const rij of (data ?? []) as { id: string; lat: number | null; lng: number | null }[]) {
    if (rij.lat != null && rij.lng != null) resultaat.set(rij.id, { lat: rij.lat, lng: rij.lng })
  }
  return resultaat
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

export type PrijsklasseVerdelingRij = { klasse: string; label: string; n: number; nEigen: number }

type PrijsklasseVerdelingRpcRij = { klasse: string; label: string; n: number; n_eigen: number }

/**
 * RPC `marktanalyse_verdeling_prijsklasse` (item 6.1, migratie
 * `20260923_marktanalyse_verdeling_en_plaatsen.sql` — nog niet toegepast,
 * zie het bestandscommentaar daar) — telling per prijsklasse, referentie-
 * implementatie: `lib/marktanalyse.ts` `PRIJSKLASSEN`.
 */
export async function marktanalyseVerdelingPrijsklasse(client: SessieClient, filters?: TransactieFilter): Promise<PrijsklasseVerdelingRij[]> {
  const { data, error } = await client.rpc('marktanalyse_verdeling_prijsklasse', { p_filters: metFilters(filters) })
  if (error) throw new Error(`marktanalyseVerdelingPrijsklasse: ${error.message}`)
  return ((data ?? []) as PrijsklasseVerdelingRpcRij[]).map(r => ({ klasse: r.klasse, label: r.label, n: r.n, nEigen: r.n_eigen }))
}

export type PlaatsWijkRij = { plaats: string; wijk: string | null; n: number }

/**
 * RPC `transacties_plaatsen_wijken` (zelfde migratie als hierboven) —
 * distincte plaats/wijk-combinaties + aantal, voedt de plaats/wijk-dropdown
 * in `FilterBar` (i.p.v. een hardgecodeerde lijst zoals het ontwerp-prototype).
 */
export async function plaatsenWijken(client: SessieClient): Promise<PlaatsWijkRij[]> {
  const { data, error } = await client.rpc('transacties_plaatsen_wijken')
  if (error) throw new Error(`plaatsenWijken: ${error.message}`)
  return (data ?? []) as PlaatsWijkRij[]
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

// ─────────────────────────────────────────────────────────────────────────
// Concurrentie v2 (item 6.3, migratie 20260924_rpc_concurrentie_v2.sql —
// toegepast op productie, geverifieerd 28 sep 2026): werkt op
// `verkopend_kantoor_norm` i.p.v. het rauwe veld hierboven. De aanroepende
// server action (`app/(app)/marktanalyse/concurrentie/actions.ts`) vangt
// elke wrapper hieronder nog steeds op met `.catch(() => null)` — verdediging
// tegen een eventuele toekomstige RPC-storing, geeft dan een nette "nog niet
// beschikbaar"-staat i.p.v. de pagina te laten crashen (zelfde patroon als
// marktanalyseVerdelingPrijsklasse hierboven).
// ─────────────────────────────────────────────────────────────────────────

type ConcurrentieRanglijstRpcRij = { kantoor: string; aantal: number; aandeel_pct: number; mediaan_looptijd: number | null }

/** RPC `concurrentie_ranglijst` — referentie-implementatie: lib/concurrentie.ts ranglijstPerKantoor(). */
export async function concurrentieRanglijst(client: SessieClient, filters?: TransactieFilter): Promise<RanglijstRij[]> {
  const { data, error } = await client.rpc('concurrentie_ranglijst', { p_filters: metFilters(filters) })
  if (error) throw new Error(`concurrentieRanglijst: ${error.message}`)
  return ((data ?? []) as ConcurrentieRanglijstRpcRij[]).map(r => ({
    kantoor: r.kantoor, aantal: r.aantal, aandeelPct: r.aandeel_pct, mediaanLooptijd: r.mediaan_looptijd,
  }))
}

type ConcurrentieWijVsMarktRpcRij = {
  looptijd_wij: number | null; looptijd_markt: number | null
  ratio_wij: number | null; ratio_markt: number | null
  m2_wij: number | null; m2_markt: number | null
  n_wij: number; n_markt: number
}

const LEGE_WIJ_VS_MARKT: WijVsMarkt = {
  looptijdWij: null, looptijdMarkt: null, ratioWij: null, ratioMarkt: null, m2Wij: null, m2Markt: null, nWij: 0, nMarkt: 0,
}

/** RPC `concurrentie_wij_vs_markt` — referentie-implementatie: lib/concurrentie.ts wijVsMarkt(). */
export async function concurrentieWijVsMarkt(client: SessieClient, filters?: TransactieFilter): Promise<WijVsMarkt> {
  const { data, error } = await client.rpc('concurrentie_wij_vs_markt', { p_filters: metFilters(filters) })
  if (error) throw new Error(`concurrentieWijVsMarkt: ${error.message}`)
  const r = ((data ?? []) as ConcurrentieWijVsMarktRpcRij[])[0]
  if (!r) return LEGE_WIJ_VS_MARKT
  return {
    looptijdWij: r.looptijd_wij, looptijdMarkt: r.looptijd_markt,
    ratioWij: r.ratio_wij, ratioMarkt: r.ratio_markt,
    m2Wij: r.m2_wij, m2Markt: r.m2_markt,
    nWij: r.n_wij, nMarkt: r.n_markt,
  }
}

type ConcurrentieAandeelJaarRpcRij = { jaar: number; kantoor: string; aantal: number; totaal: number }

/**
 * RPC `concurrentie_aandeel_jaar` — referentie-implementatie: lib/concurrentie.ts
 * aandeelPerJaar(). Bewust ONAFHANKELIJK van `filters.datum_van`/`datum_tot`
 * (de RPC negeert die zelf, zie de migratie) — geef hier gerust het volledige
 * periodefilter mee, alleen plaats/type/prijsklasse tellen mee.
 */
export async function concurrentieAandeelJaar(
  client: SessieClient,
  filters?: TransactieFilter,
  kantoren?: string[],
): Promise<AandeelJaarRij[]> {
  const { data, error } = await client.rpc('concurrentie_aandeel_jaar', {
    p_filters: metFilters(filters),
    p_kantoren: kantoren ?? null,
  })
  if (error) throw new Error(`concurrentieAandeelJaar: ${error.message}`)
  return ((data ?? []) as ConcurrentieAandeelJaarRpcRij[]).map(r => ({ jaar: r.jaar, kantoor: r.kantoor, aantal: r.aantal, totaal: r.totaal }))
}

type ConcurrentieMatrixRpcRij = {
  rij_sleutel: string; rij_label: string; woningtype_groep: string; n: number
  top3: { kantoor: string; aantal: number; aandeelPct: number }[]
}

/**
 * RPC `concurrentie_matrix` — referentie-implementatie: lib/concurrentie.ts
 * matrixWieWintWaar(). `opWijkniveau = true` zodra de explorer precies één
 * plaats geselecteerd heeft (zie ConcurrentieExplorer.tsx).
 */
export async function concurrentieMatrix(
  client: SessieClient,
  filters: TransactieFilter | undefined,
  opWijkniveau: boolean,
): Promise<MatrixCel[]> {
  const { data, error } = await client.rpc('concurrentie_matrix', {
    p_filters: metFilters(filters),
    p_op_wijkniveau: opWijkniveau,
  })
  if (error) throw new Error(`concurrentieMatrix: ${error.message}`)
  return ((data ?? []) as ConcurrentieMatrixRpcRij[]).map(r => ({
    rijSleutel: r.rij_sleutel, rijLabel: r.rij_label, woningtypeGroep: r.woningtype_groep, n: r.n, top3: r.top3 ?? [],
  }))
}

type ConcurrentieProfielRpcRij = {
  n: number; aandeel_pct: number | null; mediaan_looptijd: number | null; gem_ratio: number | null
  verdeling: { woningtypeGroep: string; n: number }[] | null
  sterkste_plaats: string | null; sterkste_aandeel_pct: number | null
  trend: { jaar: number; aantal: number }[] | null
}

/**
 * RPC `concurrentie_profiel` — referentie-implementatie: lib/concurrentie.ts
 * concurrentProfielV2(). `kantoor` is de weergavenaam ("Wassenaar Makelaars")
 * of exact `"Eigen kantoor"`.
 */
export async function concurrentieProfiel(
  client: SessieClient,
  filters: TransactieFilter | undefined,
  kantoor: string,
): Promise<ConcurrentProfielV2> {
  const { data, error } = await client.rpc('concurrentie_profiel', { p_filters: metFilters(filters), p_kantoor: kantoor })
  if (error) throw new Error(`concurrentieProfiel: ${error.message}`)
  const r = ((data ?? []) as ConcurrentieProfielRpcRij[])[0]
  if (!r) return { kantoor, n: 0, aandeelPct: null, mediaanLooptijd: null, gemRatio: null, verdeling: [], sterkstePlaats: null, sterksteAandeelPct: null, trend: [] }
  return {
    kantoor,
    n: r.n,
    aandeelPct: r.aandeel_pct,
    mediaanLooptijd: r.mediaan_looptijd,
    gemRatio: r.gem_ratio,
    verdeling: r.verdeling ?? [],
    sterkstePlaats: r.sterkste_plaats,
    sterksteAandeelPct: r.sterkste_aandeel_pct,
    trend: r.trend ?? [],
  }
}

export type Sortering =
  | 'verkoopdatum_desc' | 'verkoopdatum_asc'
  | 'prijs_desc' | 'prijs_asc'
  | 'looptijd_desc' | 'looptijd_asc'
  // Item 6.2 ("Transacties opzoeken v2"): extra kolomsortering voor de
  // DataTable — toegevoegd door de additieve migratie
  // supabase/migrations/20260923180000_transacties_zoeken_v2.sql, **toegepast**
  // (geverifieerd 27 sep 2026, item 12.3: `pg_get_functiondef` op de live
  // database bevat alle sleutels hieronder). Was ooit conditioneel op de
  // migratie; nu gewoon actief.
  | 'adres_asc' | 'adres_desc'
  | 'plaats_asc' | 'plaats_desc'
  | 'type_asc' | 'type_desc'
  | 'opp_asc' | 'opp_desc'
  | 'm2_asc' | 'm2_desc'
  | 'ratio_asc' | 'ratio_desc'
  | 'verkochtdoor_asc' | 'verkochtdoor_desc'

export type ZoekTransactiesResultaat = { rijen: TransactieRow[]; totaal: number }

/**
 * RPC `transacties_zoeken` — gepagineerd + gesorteerd, geeft ook het totaal
 * mee (voorbij de PostgREST-limiet van 1.000). Valt bij `PGRST202` (de
 * functie ontbreekt — bv. een omgeving waar de migratie nog niet is
 * toegepast) terug op `zoekTransactiesTerugval()`: dezelfde filter-/sorteer-/
 * pagina-semantiek, maar client-side op de volledige rijenset (§ 3.1
 * patroon 1). Zo kan code die op deze functie leunt veilig gemerged worden
 * vóórdat een migratie live is — precies de situatie die deze functie zelf
 * ooit was (zie het bestandscommentaar hierboven).
 */
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
  if (error) {
    if (error.code === 'PGRST202') return zoekTransactiesTerugval(client, filters, opties)
    throw new Error(`zoekTransacties: ${error.message}`)
  }
  const resultaat = (data ?? { totaal: 0, rijen: [] }) as { totaal: number; rijen: TransactieRow[] }
  return { rijen: resultaat.rijen ?? [], totaal: resultaat.totaal ?? 0 }
}

let zoekTransactiesTerugvalGelogd = false

/** `TransactieFilter` (RPC-vorm) → `MarktanalyseFilterV2` (voor `filterEigenRijen()`, lib/marktanalyse.ts) — dezelfde velden, alleen de naamgeving verschilt. */
function transactieFilterNaarMarktanalyseFilter(f: TransactieFilter): MarktanalyseFilterV2 {
  return {
    plaatsen: f.plaatsen ?? [],
    wijken: f.wijken ?? [],
    typen: f.typen ?? [],
    datumVan: f.datum_van,
    datumTot: f.datum_tot,
    prijsMin: f.prijs_min,
    prijsMax: f.prijs_max,
    oppMin: f.opp_min,
    oppMax: f.opp_max,
    bouwjaarMin: f.bouwjaar_min,
    bouwjaarMax: f.bouwjaar_max,
    energielabels: f.energielabels ?? [],
    kamersMin: f.kamers_min,
    perceelMin: f.perceel_min,
    perceelMax: f.perceel_max,
    tuin: f.tuin,
    garage: f.garage,
    tovVraagprijs: f.tov_vraagprijs,
  }
}

/** Comparator die de `order by` van de RPC `transacties_zoeken` spiegelt (nulls last, `id asc` als laatste tiebreaker). */
function terugvalComparator(sortering: Sortering): (a: TransactieRow, b: TransactieRow) => number {
  const richting = sortering.endsWith('_asc') ? 1 : -1
  const sleutel: (r: TransactieRow) => string | number | null = sortering.startsWith('prijs')
    ? r => r.verkoopprijs
    : sortering.startsWith('looptijd')
      ? r => r.looptijd_dagen
      : sortering.startsWith('adres')
        ? r => r.adres
        : sortering.startsWith('plaats')
          ? r => `${r.plaats ?? ''}|${r.wijk ?? ''}`
          : sortering.startsWith('type')
            ? r => r.woningtype_sub
            : sortering.startsWith('opp')
              ? r => r.woonoppervlak_m2
              : sortering.startsWith('m2')
                ? r => r.prijs_m2
                : sortering.startsWith('ratio')
                  ? r => (r.verkoopprijs != null && r.vraagprijs != null && r.vraagprijs !== 0 ? ((r.verkoopprijs - r.vraagprijs) / r.vraagprijs) * 100 : null)
                  : sortering.startsWith('verkochtdoor')
                    ? r => (r.eigen_verkoop ? '' : (r.verkopend_kantoor_norm ?? r.verkopend_kantoor ?? ''))
                    : r => r.verkoopdatum
  return (a, b) => {
    const av = sleutel(a)
    const bv = sleutel(b)
    const idVergelijk = a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    if (av == null && bv == null) return idVergelijk
    if (av == null) return 1
    if (bv == null) return -1
    if (av < bv) return -1 * richting
    if (av > bv) return 1 * richting
    return idVergelijk
  }
}

/**
 * Terugval voor `zoekTransacties()` als de RPC ontbreekt: dezelfde
 * `transacties_gefilterd`-semantiek client-side via `filterEigenRijen()`
 * (plaats/wijk/type/datum/prijs/opp/bouwjaar/energielabel/kamers/perceel/
 * tuin/garage/t.o.v. vraagprijs), plus de velden die `filterEigenRijen` niet
 * dekt (`alleen_eigen`, `kantoren`, `looptijd_max`, `zoek` — zelfde patroon
 * als `filtreerEigenVoorExport()` in lib/transactiesZoeken.ts), gesorteerd
 * met `terugvalComparator()` en client-side gepagineerd. Logt één keer.
 */
async function zoekTransactiesTerugval(
  client: SessieClient,
  filters: TransactieFilter | undefined,
  opties: { sortering?: Sortering; limiet?: number; offset?: number },
): Promise<ZoekTransactiesResultaat> {
  if (!zoekTransactiesTerugvalGelogd) {
    zoekTransactiesTerugvalGelogd = true
    console.warn('[transacties] RPC ontbreekt, terugval')
  }
  const f = metFilters(filters)
  const alle = await haalTransactiesVoorVerkenner<TransactieRow>(client, ALLE_TRANSACTIE_KOLOMMEN)
  let gefilterd = filterEigenRijen(alle, transactieFilterNaarMarktanalyseFilter(f))
  if (f.alleen_eigen) gefilterd = gefilterd.filter(r => r.eigen_verkoop)
  if (f.kantoren?.length) gefilterd = gefilterd.filter(r => r.verkopend_kantoor != null && f.kantoren!.includes(r.verkopend_kantoor))
  if (f.looptijd_max != null) gefilterd = gefilterd.filter(r => r.looptijd_dagen != null && r.looptijd_dagen <= f.looptijd_max!)
  if (f.zoek?.trim()) {
    const q = f.zoek.trim().toLowerCase()
    gefilterd = gefilterd.filter(r => r.adres.toLowerCase().includes(q))
  }
  const gesorteerd = [...gefilterd].sort(terugvalComparator(opties.sortering ?? 'verkoopdatum_desc'))
  const offset = opties.offset ?? 0
  const limiet = opties.limiet ?? 50
  return { rijen: gesorteerd.slice(offset, offset + limiet), totaal: gesorteerd.length }
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
