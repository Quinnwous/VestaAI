'use server'

/**
 * Server action voor de marktanalyse-explorer v2 (item 6.1): ververst de
 * regionale aggregaties (RPC's) op elke filterwijziging, zonder de pagina te
 * herladen. Eigen verkopen ("wij") komen één keer mee met de pagina zelf
 * (patroon 1, ≤ 2.000 rijen) en worden client-side gefilterd — zie
 * `components/MarktanalyseExplorer.tsx`. Dit is de enige plek buiten
 * `lib/transactiesQuery.ts` die de RPC-wrappers aanroept; de eigenlijke
 * `.rpc(...)`/`.from('transacties')`-aanroepen blijven daar (guard-test).
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import {
  marktanalyseReeks,
  marktanalyseSamenvatting,
  marktanalyseVerdelingPrijsklasse,
  type MarktanalyseReeksRij,
  type MarktanalyseSamenvatting,
  type PrijsklasseVerdelingRij,
} from '@/lib/transactiesQuery'
import type { TransactieFilter } from '@/lib/schemas'

export type MarktanalyseData = {
  reeksMarkt: MarktanalyseReeksRij[]
  reeksB: MarktanalyseReeksRij[] | null
  samenvatting: MarktanalyseSamenvatting
  /** `null` = de verdeling-RPC faalde onverwacht — zie het foutmeldingblok hieronder. */
  verdeling: PrijsklasseVerdelingRij[] | null
}

/**
 * `filtersA` = segment A mét prijsklasse-crossfilter (reeks + tegels),
 * `filtersVerdeling` = segment A zónder de crossfilter (de staven zelf mogen
 * niet verdwijnen zodra je er één aanklikt — alleen visueel dimmen),
 * `filtersB` = segment B, of `null` als de vergelijking uit staat.
 */
export async function haalMarktanalyseData(
  filtersA: TransactieFilter,
  filtersVerdeling: TransactieFilter,
  filtersB: TransactieFilter | null,
): Promise<MarktanalyseData> {
  const supabase = createServerSupabaseClient()
  // De RPC-bug die `vorig.n` op 0 hield zodra `filtersA` een datum_van/datum_tot
  // had, is gefixt en toegepast (`20260924_fix_marktanalyse_samenvatting_vorige_periode.sql`,
  // geverifieerd tegen productie 27 sep 2026) — één aanroep levert nu zowel
  // `.huidig` als een kloppende `.vorig` op.
  const [reeksMarkt, samenvatting, verdeling, reeksB] = await Promise.all([
    marktanalyseReeks(supabase, filtersA),
    marktanalyseSamenvatting(supabase, filtersA),
    // `marktanalyse_verdeling_prijsklasse` (migratie
    // 20260923_marktanalyse_verdeling_en_plaatsen.sql) is live sinds 23 sep
    // 2026. De `.catch()` is verdediging tegen een eventuele toekomstige
    // RPC-storing: de UI toont dan een eigen foutstaat voor dat blok i.p.v.
    // de hele pagina te laten crashen.
    marktanalyseVerdelingPrijsklasse(supabase, filtersVerdeling).catch(() => null),
    filtersB ? marktanalyseReeks(supabase, filtersB) : Promise.resolve(null),
  ])
  return { reeksMarkt, samenvatting, verdeling, reeksB }
}
