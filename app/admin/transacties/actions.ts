'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { parseTransactieCsv, type TransactieInsert } from '@/lib/transactieImport'
import {
  planTerugdraai, bouwSnapshotUitBestaande, bouwSleutel,
  type BestaandeTransactieVoorSnapshot, type ImportVoorTerugdraai,
} from '@/lib/importTerugdraaien'
import type { ImportSnapshotRij } from '@/lib/importSnapshot'

async function vereisPlatformAdmin(): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isPlatformAdmin(user?.email)
}

export type ImportPreview = {
  ok: true
  aantalGeldig: number
  aantalOvergeslagen: number
  overgeslagen: { regel: number; reden: string }[]
  voorbeeld: TransactieInsert[]
  gevondenKolommen: string[]
} | { ok: false; error: string }

/** Toont wat een CSV-bestand zou opleveren, zónder iets te schrijven — voor controle vóór import. */
export async function previewTransactieImport(csvTekst: string): Promise<ImportPreview> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  if (!csvTekst.trim()) return { ok: false, error: 'Leeg bestand' }

  const { rijen, overgeslagen, gevondenKolommen } = parseTransactieCsv(csvTekst)
  if (rijen.length === 0) {
    return { ok: false, error: 'Geen bruikbare rijen gevonden — controleer of er een adres-kolom bestaat.' }
  }

  return {
    ok: true,
    aantalGeldig: rijen.length,
    aantalOvergeslagen: overgeslagen.length,
    overgeslagen: overgeslagen.slice(0, 20),
    voorbeeld: rijen.slice(0, 5),
    gevondenKolommen,
  }
}

/** Precies de kolommen die een import op `transacties` schrijft — dezelfde set voor elke rij, zie lib/importTerugdraaien.ts. */
type BestaandeRijRuw = {
  id: string
  adres: string
  postcode: string | null
  plaats: string | null
  wijk: string | null
  buurt: string | null
  lat: number | null
  lng: number | null
  verkoopprijs: number | null
  vraagprijs: number | null
  verkoopdatum: string | null
  looptijd_dagen: number | null
  woningtype: string | null
  woonoppervlak_m2: number | null
  perceel_m2: number | null
  inhoud_m3: number | null
  bouwjaar: number | null
  energielabel: string | null
  kamers: number | null
  garage: boolean | null
  tuin: boolean | null
  buitenruimte: string | null
  eigen_verkoop: boolean
  verkopend_kantoor: string | null
  bron: string | null
  adres_sleutel: string
  huisnummer: number | null
  toevoeging: string | null
  woningtype_groep: string | null
  woningtype_sub: string | null
  import_id: string | null
}

const BESTAANDE_KOLOMMEN = 'id, adres, postcode, plaats, wijk, buurt, lat, lng, verkoopprijs, vraagprijs, verkoopdatum, looptijd_dagen, woningtype, woonoppervlak_m2, perceel_m2, inhoud_m3, bouwjaar, energielabel, kamers, garage, tuin, buitenruimte, eigen_verkoop, verkopend_kantoor, bron, adres_sleutel, huisnummer, toevoeging, woningtype_groep, woningtype_sub, import_id'

/**
 * Voegt de rijen uit een CSV-bestand toe aan de transactiedataset van één
 * kantoor. Upsert op (kantoor_id, adres_sleutel, verkoopdatum) — de
 * genormaliseerde sleutel uit lib/transactieNormalisatie.ts (item 2.1, zie
 * de migratie 20260917_transacties_pijplijn.sql, die de oude adres-gebaseerde
 * unieke index vervangt) — zodat een periodieke herimport (F4,
 * "Admin-databeheer & maatwerk") records bijwerkt in plaats van te
 * verdubbelen, ook als het adres net iets anders geschreven is.
 *
 * Schrijft sinds item 5.4 ook een `imports`-rij (bron 'handmatig') en zet
 * `import_id` op elke geschreven rij, zodat "Laatste import terugdraaien"
 * werkt — inclusief een snapshot van de rijen die deze import overschrijft
 * (lib/importTerugdraaien.ts `bouwSnapshotUitBestaande`, contract in
 * lib/importSnapshot.ts), opgebouwd vóór de upsert.
 */
export async function bevestigTransactieImport(
  kantoorId: string,
  csvTekst: string,
  bestandsnaam?: string,
): Promise<{ ok: true; aantal: number } | { ok: false; error: string }> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }

  const { rijen, overgeslagen } = parseTransactieCsv(csvTekst)
  if (rijen.length === 0) return { ok: false, error: 'Geen bruikbare rijen gevonden' }

  const service = createServiceSupabaseClient()

  // 1. Snapshot van bestaande rijen die deze import gaat overschrijven —
  // vóór de upsert, anders zijn de "vorige" waarden al weg.
  const nieuweSleutels = new Set(rijen.map(r => bouwSleutel(r.adres_sleutel, r.verkoopdatum)))
  const sleutelsLijst = Array.from(new Set(rijen.map(r => r.adres_sleutel)))

  const { data: bestaandeRuw, error: bestaandeError } = await service
    .from('transacties_met_coordinaten')
    .select(BESTAANDE_KOLOMMEN)
    .eq('kantoor_id', kantoorId)
    .in('adres_sleutel', sleutelsLijst)

  if (bestaandeError) return { ok: false, error: `Kon bestaande rijen niet ophalen: ${bestaandeError.message}` }

  const bestaandeVoorSnapshot: BestaandeTransactieVoorSnapshot[] = ((bestaandeRuw ?? []) as BestaandeRijRuw[]).map(r => {
    const { id, lat, lng, adres_sleutel, verkoopdatum, ...vorigeKolommen } = r
    return {
      id,
      adresSleutel: adres_sleutel,
      verkoopdatum,
      vorige: {
        ...vorigeKolommen,
        adres_sleutel,
        verkoopdatum,
        geo: lat != null && lng != null ? `POINT(${lng} ${lat})` : null,
      },
    }
  })

  const snapshot = bouwSnapshotUitBestaande(bestaandeVoorSnapshot, nieuweSleutels)

  // 2. Importrecord aanmaken (status 'bezig') — bestaat altijd, ook als de upsert hieronder faalt.
  const { data: importRow, error: importInsertError } = await service
    .from('imports')
    .insert({
      kantoor_id: kantoorId,
      bron: 'handmatig',
      bestandsnaam: bestandsnaam?.trim() || null,
      aantal_rijen: rijen.length,
      status: 'bezig',
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
    const batch: (TransactieInsert & { kantoor_id: string; import_id: string })[] = rijen
      .slice(i, i + BATCH)
      .map(r => ({ ...r, kantoor_id: kantoorId, import_id: importId }))

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
  const aantalBijgewerkt = snapshot.bijgewerkt.length
  await service
    .from('imports')
    .update({
      status: 'klaar',
      klaar_op: new Date().toISOString(),
      aantal_nieuw: Math.max(0, rijen.length - aantalBijgewerkt),
      aantal_bijgewerkt: aantalBijgewerkt,
      aantal_uitgesloten: overgeslagen.length,
      snapshot_json: snapshot,
    })
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
