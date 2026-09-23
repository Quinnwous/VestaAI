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
import { vorigePeriodeFilter } from '@/lib/marktanalyse'
import type { TransactieFilter } from '@/lib/schemas'

export type MarktanalyseData = {
  reeksMarkt: MarktanalyseReeksRij[]
  reeksB: MarktanalyseReeksRij[] | null
  samenvatting: MarktanalyseSamenvatting
  /** `null` = de verdeling-RPC is (nog) niet beschikbaar — zie het foutmeldingblok hieronder. */
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
  // Werk-around (fix review item 6.1, 24 sep 2026) voor een RPC-bug: zodra
  // `filtersA` een datum_van/datum_tot heeft, geeft `marktanalyse_samenvatting`
  // altijd `vorig.n = 0` terug (zie `vorigePeriodeFilter` in lib/marktanalyse.ts
  // voor de volledige uitleg + de SQL-fix die daar ook naar verwijst). Tot die
  // migratie is toegepast, halen we de vorige periode apart op via een tweede
  // aanroep met de verschoven datums, en gebruiken we dáárvan de "huidig"-tak
  // (die de bug niet heeft).
  const vorigeFilter = vorigePeriodeFilter(filtersA)
  const [reeksMarkt, samenvattingHuidig, samenvattingVorig, verdeling, reeksB] = await Promise.all([
    marktanalyseReeks(supabase, filtersA),
    marktanalyseSamenvatting(supabase, filtersA),
    vorigeFilter ? marktanalyseSamenvatting(supabase, vorigeFilter) : Promise.resolve(null),
    // `marktanalyse_verdeling_prijsklasse` staat klaar in
    // supabase/migrations/20260923_marktanalyse_verdeling_en_plaatsen.sql maar
    // is nog niet toegepast (zie dat bestand) — tot dat gebeurt geeft de RPC
    // een "function does not exist"-fout; de UI toont dan een eigen foutstaat
    // voor dat blok i.p.v. de hele pagina te laten crashen.
    marktanalyseVerdelingPrijsklasse(supabase, filtersVerdeling).catch(() => null),
    filtersB ? marktanalyseReeks(supabase, filtersB) : Promise.resolve(null),
  ])
  const samenvatting: MarktanalyseSamenvatting = {
    huidig: samenvattingHuidig.huidig,
    vorig: samenvattingVorig ? samenvattingVorig.huidig : samenvattingHuidig.vorig,
  }
  return { reeksMarkt, samenvatting, verdeling, reeksB }
}
