'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { parseCsv, vindKolom, ALIASSEN, type TransactieVeld } from '@/lib/transactieImport'
import { PROFIELEN } from '@/lib/importProfielen'
import {
  voerImportPijplijnUit, bouwSnapshot, telNieuwEnBijgewerkt,
  type GenormaliseerdeRij, type ImportRapport, type BestaandeTransactieRij,
} from '@/lib/importPijplijn'
import {
  planTerugdraai, type ImportVoorTerugdraai,
} from '@/lib/importTerugdraaien'
import type { ImportSnapshotRij } from '@/lib/importSnapshot'

async function vereisPlatformAdmin(): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isPlatformAdmin(user?.email)
}

/** `kantoren.instellingen_json.kantoor_aliassen` van één kantoor — bepaalt `eigen_verkoop` via `isEigenKantoor()` in de pijplijn. */
async function haalKantoorAliassen(
  service: ReturnType<typeof createServiceSupabaseClient>,
  kantoorId: string,
): Promise<string[]> {
  const { data } = await service.from('kantoren').select('instellingen_json').eq('id', kantoorId).maybeSingle()
  const instellingen = data?.instellingen_json as { kantoor_aliassen?: string[] } | null | undefined
  return instellingen?.kantoor_aliassen ?? []
}

/**
 * Parseert een CSV-bestand en draait 'm door de volledige importpijplijn
 * (item i2, docs/specs/i2-admin-csv-via-pijplijn.md) — dezelfde
 * `voerImportPijplijnUit()` als `scripts/import-transacties.mjs`, met bron
 * `'handmatig'` (profiel = de gedeelde `ALIASSEN`, geen bron-specifieke
 * aliassen). `null` bij een leeg bestand (geen datarij na de header).
 */
function voerPijplijnUitOpCsv(
  csvTekst: string,
  kantoorAliassen: string[],
): { headers: string[]; rijen: GenormaliseerdeRij[]; rapport: ImportRapport } | null {
  const alleRijen = parseCsv(csvTekst)
  if (alleRijen.length < 2) return null
  const headers = alleRijen[0]
  const ruweRijen = alleRijen.slice(1)
  const { rijen, rapport } = voerImportPijplijnUit(ruweRijen, headers, PROFIELEN.handmatig, kantoorAliassen)
  return { headers, rijen, rapport }
}

export type ImportPreview = {
  ok: true
  rapport: ImportRapport
  /** rapport.totaalGeimporteerd minus de uitgesloten rijen — rijen die zónder waarschuwing worden geïmporteerd. */
  aantalGeldig: number
  voorbeeld: GenormaliseerdeRij[]
  gevondenKolommen: TransactieVeld[]
} | { ok: false; error: string }

/**
 * Toont wat een CSV-bestand voor het gekozen kantoor zou opleveren, zónder
 * iets te schrijven — voor controle vóór import. Loopt sinds item i2 via
 * dezelfde pijplijn als het importscript, dus met kwaliteitsregels,
 * ontdubbelen en de eigen_verkoop-afleiding via kantoor-aliassen.
 */
export async function previewTransactieImport(kantoorId: string, csvTekst: string): Promise<ImportPreview> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  if (!kantoorId) return { ok: false, error: 'Geen kantoor geselecteerd' }
  if (!csvTekst.trim()) return { ok: false, error: 'Leeg bestand' }

  const service = createServiceSupabaseClient()
  const kantoorAliassen = await haalKantoorAliassen(service, kantoorId)

  const resultaat = voerPijplijnUitOpCsv(csvTekst, kantoorAliassen)
  if (!resultaat || resultaat.rijen.length === 0) {
    return { ok: false, error: 'Geen bruikbare rijen gevonden — controleer of er een adres-kolom bestaat.' }
  }
  const { headers, rijen, rapport } = resultaat

  const gevondenKolommen = (Object.keys(ALIASSEN) as TransactieVeld[]).filter(v => vindKolom(headers, v) !== -1)
  const aantalUitgesloten = rapport.perUitsluitreden.reduce((som, r) => som + r.aantal, 0)

  return {
    ok: true,
    rapport,
    aantalGeldig: rapport.totaalGeimporteerd - aantalUitgesloten,
    voorbeeld: rijen.slice(0, 5),
    gevondenKolommen,
  }
}

/** Precies de kolommen die een import op `transacties` schrijft (`GenormaliseerdeRij`) + `id`/`lat`/`lng` — zelfde set als `BESTAANDE_KOLOMMEN` in scripts/import-transacties.mjs, maar via `transacties_met_coordinaten` (lat/lng in plaats van de ruwe `geo`, zie CLAUDE.md § transactiedataset). */
const BESTAANDE_KOLOMMEN = [
  'id', 'adres', 'postcode', 'plaats', 'wijk', 'buurt', 'lat', 'lng',
  'verkoopprijs', 'vraagprijs', 'verkoopdatum', 'looptijd_dagen', 'woningtype',
  'woonoppervlak_m2', 'perceel_m2', 'inhoud_m3', 'bouwjaar', 'energielabel',
  'kamers', 'garage', 'tuin', 'buitenruimte', 'eigen_verkoop', 'verkopend_kantoor',
  'bron', 'adres_sleutel', 'huisnummer', 'toevoeging', 'woningtype_groep', 'woningtype_sub',
  'geocode_status', 'uitgesloten_reden', 'aankopend_kantoor', 'verkopend_kantoor_norm',
  'import_id',
].join(', ')

type BestaandeRijRuw = {
  id: string
  adres_sleutel: string
  verkoopdatum: string | null
  import_id: string | null
  lat: number | null
  lng: number | null
} & Record<string, unknown>

/**
 * Voegt de rijen uit een CSV-bestand toe aan de transactiedataset van één
 * kantoor — sinds item i2 via dezelfde `voerImportPijplijnUit()` +
 * `bouwSnapshot()` als `scripts/import-transacties.mjs` (bron 'handmatig'),
 * dus met kwaliteitsregels (`uitgesloten_reden`, rijen blijven bestaan),
 * ontdubbelen en een gevuld `kwaliteitsrapport_json`. Upsert op (kantoor_id,
 * adres_sleutel, verkoopdatum) — de genormaliseerde sleutel uit
 * lib/transactieNormalisatie.ts — zodat een periodieke herimport records
 * bijwerkt in plaats van te verdubbelen, ook als het adres net iets anders
 * geschreven is.
 *
 * Schrijft ook een `imports`-rij en zet `import_id` op elke geschreven rij,
 * zodat "Laatste import terugdraaien" werkt — inclusief een snapshot van de
 * rijen die deze import overschrijft (`bouwSnapshot()`,
 * lib/importPijplijn.ts, contract in lib/importSnapshot.ts), opgebouwd vóór
 * de upsert.
 */
export async function bevestigTransactieImport(
  kantoorId: string,
  csvTekst: string,
  bestandsnaam?: string,
): Promise<{ ok: true; aantal: number } | { ok: false; error: string }> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  if (!kantoorId) return { ok: false, error: 'Geen kantoor geselecteerd' }

  const service = createServiceSupabaseClient()
  const kantoorAliassen = await haalKantoorAliassen(service, kantoorId)

  const resultaat = voerPijplijnUitOpCsv(csvTekst, kantoorAliassen)
  if (!resultaat || resultaat.rijen.length === 0) return { ok: false, error: 'Geen bruikbare rijen gevonden' }
  const { rijen, rapport } = resultaat

  // 1. Snapshot van bestaande rijen die deze import gaat overschrijven —
  // vóór de upsert, anders zijn de "vorige" waarden al weg.
  const sleutelsLijst = Array.from(new Set(rijen.map(r => r.adres_sleutel)))

  // In stukken: duizenden sleutels in één `.in()` maken de GET-URL te lang voor PostgREST.
  const SLEUTEL_CHUNK = 200
  const bestaandeRuw: BestaandeRijRuw[] = []
  for (let i = 0; i < sleutelsLijst.length; i += SLEUTEL_CHUNK) {
    const { data, error: bestaandeError } = await service
      .from('transacties_met_coordinaten')
      .select(BESTAANDE_KOLOMMEN)
      .eq('kantoor_id', kantoorId)
      .in('adres_sleutel', sleutelsLijst.slice(i, i + SLEUTEL_CHUNK))
    if (bestaandeError) return { ok: false, error: `Kon bestaande rijen niet ophalen: ${bestaandeError.message}` }
    bestaandeRuw.push(...((data ?? []) as unknown as BestaandeRijRuw[]))
  }

  // bouwSnapshot() rekent zelf niets om — de rauwe lat/lng van de view worden
  // hier omgezet naar dezelfde WKT ('POINT(lng lat)') die de import zelf op
  // `geo` schrijft, zodat terugdraaien het exacte vorige coördinaat herstelt.
  const bestaandeVoorSnapshot: BestaandeTransactieRij[] = bestaandeRuw.map(r => {
    const { lat, lng, ...rest } = r
    return { ...rest, geo: lat != null && lng != null ? `POINT(${lng} ${lat})` : null }
  })

  const snapshot = bouwSnapshot(bestaandeVoorSnapshot, rijen)
  const { nieuw, bijgewerkt } = telNieuwEnBijgewerkt(bestaandeVoorSnapshot, rijen)
  const aantalUitgesloten = rijen.filter(r => r.uitgesloten_reden).length

  // 2. Importrecord aanmaken (status 'bezig') — bestaat altijd, ook als de upsert hieronder faalt.
  const { data: importRow, error: importInsertError } = await service
    .from('imports')
    .insert({
      kantoor_id: kantoorId,
      bron: 'handmatig',
      bestandsnaam: bestandsnaam?.trim() || null,
      aantal_rijen: rijen.length,
      aantal_nieuw: nieuw,
      aantal_bijgewerkt: bijgewerkt,
      aantal_uitgesloten: aantalUitgesloten,
      kwaliteitsrapport_json: rapport,
      status: 'bezig',
      // Vóór de eerste upsert opgeslagen, zodat ook een mislukte import terug kan.
      snapshot_json: snapshot,
    })
    .select('id')
    .single()

  if (importInsertError || !importRow) {
    return { ok: false, error: `Kon importrecord niet aanmaken: ${importInsertError?.message ?? 'onbekende fout'}` }
  }
  const importId = importRow.id as string

  // 3. Upsert in batches, elke rij krijgt dit import_id.
  const BATCH = 500
  let ingevoegd = 0

  for (let i = 0; i < rijen.length; i += BATCH) {
    const batch = rijen.slice(i, i + BATCH).map(r => ({ ...r, kantoor_id: kantoorId, import_id: importId }))

    const { error, count } = await service
      .from('transacties')
      .upsert(batch, { onConflict: 'kantoor_id,adres_sleutel,verkoopdatum', count: 'exact' })

    if (error) {
      await service.from('imports').update({ status: 'mislukt', klaar_op: new Date().toISOString() }).eq('id', importId)
      return { ok: false, error: `Fout bij batch ${i / BATCH + 1}: ${error.message}` }
    }
    ingevoegd += count ?? batch.length
  }

  // 4. Importrecord afronden.
  await service
    .from('imports')
    .update({ status: 'klaar', klaar_op: new Date().toISOString() })
    .eq('id', importId)

  revalidatePath('/admin/transacties')
  return { ok: true, aantal: ingevoegd }
}

// ── Importhistorie + terugdraaien (item 5.4) ────────────────────────────────

type ImportRuw = {
  id: string
  kantoor_id: string
  status: 'bezig' | 'klaar' | 'mislukt' | 'teruggedraaid'
  snapshot_json: unknown
}

/** Haalt de import zelf, de laatste (niet-teruggedraaide) import-id van dat kantoor, en de huidige rij-ids met dit import_id op — de invoer voor `planTerugdraai`. */
async function haalTerugdraaiPlan(
  service: ReturnType<typeof createServiceSupabaseClient>,
  importId: string,
) {
  const { data: imp, error: impError } = await service
    .from('imports')
    .select('id, kantoor_id, status, snapshot_json')
    .eq('id', importId)
    .maybeSingle()

  if (impError) return { ok: false as const, error: `Kon import niet ophalen: ${impError.message}` }
  if (!imp) return { ok: false as const, error: 'Import niet gevonden' }

  const importRij = imp as ImportRuw

  const { data: laatste, error: laatsteError } = await service
    .from('imports')
    .select('id')
    .eq('kantoor_id', importRij.kantoor_id)
    .neq('status', 'teruggedraaid')
    .order('gestart_op', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (laatsteError) return { ok: false as const, error: `Kon laatste import niet bepalen: ${laatsteError.message}` }

  const { data: rijenMetImportId, error: rijenError } = await service
    .from('transacties')
    .select('id')
    .eq('kantoor_id', importRij.kantoor_id)
    .eq('import_id', importId)

  if (rijenError) return { ok: false as const, error: `Kon huidige rijen niet ophalen: ${rijenError.message}` }

  const impVoorPlan: ImportVoorTerugdraai = { id: importRij.id, kantoor_id: importRij.kantoor_id, status: importRij.status }

  const plan = planTerugdraai({
    imp: impVoorPlan,
    laatsteImportIdVanKantoor: (laatste as { id: string } | null)?.id ?? null,
    snapshot: importRij.snapshot_json,
    rijIdsMetImportId: ((rijenMetImportId ?? []) as { id: string }[]).map(r => r.id),
  })

  return { ok: true as const, kantoorId: importRij.kantoor_id, plan }
}

export type TerugdraaiPreview =
  | { ok: true; hersteld: number; verwijderd: number }
  | { ok: false; error: string }

/** Rekent uit wat "Laatste import terugdraaien" zou doen, zónder iets te wijzigen — voor de bevestigingsstap in de UI. */
export async function bekijkTerugdraaiPlan(importId: string): Promise<TerugdraaiPreview> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const resultaat = await haalTerugdraaiPlan(service, importId)
  if (!resultaat.ok) return { ok: false, error: resultaat.error }
  if (!resultaat.plan.ok) return { ok: false, error: resultaat.plan.reden }

  return { ok: true, hersteld: resultaat.plan.herstel.length, verwijderd: resultaat.plan.verwijder.length }
}

export type TerugdraaiResultaat =
  | { ok: true; hersteld: number; verwijderd: number }
  | { ok: false; error: string }

/**
 * Draait de laatste import van een kantoor daadwerkelijk terug: bijgewerkte
 * rijen krijgen hun vorige kolomwaarden terug (uit `imports.snapshot_json`),
 * rijen die deze import heeft toegevoegd worden verwijderd — altijd met
 * `kantoor_id` én `import_id` als harde filter bij het verwijderen, zodat een
 * verkeerde id nooit rijen van een ander kantoor of een andere import raakt.
 * Stopt en meldt precies wat al gedaan is zodra een stap faalt, in plaats van
 * stil door te gaan met een half teruggedraaide import.
 */
export async function terugdraaienImport(importId: string): Promise<TerugdraaiResultaat> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const resultaat = await haalTerugdraaiPlan(service, importId)
  if (!resultaat.ok) return { ok: false, error: resultaat.error }
  if (!resultaat.plan.ok) return { ok: false, error: resultaat.plan.reden }

  const { kantoorId, plan } = resultaat

  // 1. Herstellen: elke bijgewerkte rij terug naar haar vorige kolomwaarden.
  const HERSTEL_PARALLEL = 20
  let hersteld = 0
  for (let i = 0; i < plan.herstel.length; i += HERSTEL_PARALLEL) {
    const chunk: ImportSnapshotRij[] = plan.herstel.slice(i, i + HERSTEL_PARALLEL)
    const uitkomsten = await Promise.all(
      chunk.map(r => service.from('transacties').update(r.vorige).eq('id', r.id).eq('kantoor_id', kantoorId)),
    )
    const fout = uitkomsten.find(u => u.error)
    if (fout?.error) {
      return {
        ok: false,
        error: `${hersteld} van ${plan.herstel.length} rijen hersteld, daarna gestopt bij herstellen: ${fout.error.message}. Er is nog niets verwijderd — controleer de dataset handmatig voordat je het opnieuw probeert.`,
      }
    }
    hersteld += chunk.length
  }

  // 2. Verwijderen: rijen die deze import heeft toegevoegd, in batches, altijd met kantoor_id + import_id als harde filter.
  const BATCH = 500
  let verwijderd = 0
  for (let i = 0; i < plan.verwijder.length; i += BATCH) {
    const chunk = plan.verwijder.slice(i, i + BATCH)
    const { error, count } = await service
      .from('transacties')
      .delete({ count: 'exact' })
      .eq('kantoor_id', kantoorId)
      .eq('import_id', importId)
      .in('id', chunk)

    if (error) {
      return {
        ok: false,
        error: `${hersteld} rijen hersteld, ${verwijderd} van ${plan.verwijder.length} rijen verwijderd, daarna gestopt: ${error.message}. Controleer de dataset handmatig.`,
      }
    }
    verwijderd += count ?? chunk.length
  }

  // 3. Import markeren als teruggedraaid.
  const { error: updateError } = await service
    .from('imports')
    .update({ status: 'teruggedraaid', teruggedraaid_op: new Date().toISOString() })
    .eq('id', importId)

  if (updateError) {
    return {
      ok: false,
      error: `${hersteld} rijen hersteld en ${verwijderd} rijen verwijderd, maar het markeren van de import als teruggedraaid is mislukt: ${updateError.message}. Voer dit niet nogmaals uit — controleer handmatig in de database.`,
    }
  }

  revalidatePath('/admin/transacties')
  return { ok: true, hersteld, verwijderd }
}
