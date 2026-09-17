'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { parseTransactieCsv, type TransactieInsert } from '@/lib/transactieImport'

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

/**
 * Voegt de rijen uit een CSV-bestand toe aan de transactiedataset van één
 * kantoor. Upsert op (kantoor_id, adres_sleutel, verkoopdatum) — de
 * genormaliseerde sleutel uit lib/transactieNormalisatie.ts (item 2.1, zie
 * de migratie 20260917_transacties_pijplijn.sql, die de oude adres-gebaseerde
 * unieke index vervangt) — zodat een periodieke herimport (F4,
 * "Admin-databeheer & maatwerk") records bijwerkt in plaats van te
 * verdubbelen, ook als het adres net iets anders geschreven is.
 */
export async function bevestigTransactieImport(kantoorId: string, csvTekst: string): Promise<
  { ok: true; aantal: number } | { ok: false; error: string }
> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }

  const { rijen } = parseTransactieCsv(csvTekst)
  if (rijen.length === 0) return { ok: false, error: 'Geen bruikbare rijen gevonden' }

  const service = createServiceSupabaseClient()
  const BATCH = 500
  let ingevoegd = 0

  for (let i = 0; i < rijen.length; i += BATCH) {
    const batch: (TransactieInsert & { kantoor_id: string })[] = rijen
      .slice(i, i + BATCH)
      .map(r => ({ ...r, kantoor_id: kantoorId }))

    const { error, count } = await service
      .from('transacties')
      .upsert(batch, { onConflict: 'kantoor_id,adres_sleutel,verkoopdatum', count: 'exact' })

    if (error) return { ok: false, error: `Fout bij batch ${i / BATCH + 1}: ${error.message}` }
    ingevoegd += count ?? batch.length
  }

  revalidatePath('/admin/transacties')
  return { ok: true, aantal: ingevoegd }
}
