'use server'

/**
 * Server action voor "Transacties opzoeken v2" (item 6.2): haalt één pagina
 * van de RPC `transacties_zoeken` op bij elke filter-/sorteer-/paginawijziging,
 * zonder de pagina te herladen — zelfde patroon als
 * `app/(app)/marktanalyse/actions.ts` (item 6.1). Dit is de enige plek buiten
 * `lib/transactiesQuery.ts` die de RPC-wrapper aanroept; de eigenlijke
 * `.rpc(...)`-aanroep blijft daar (guard-test).
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import {
  zoekTransacties,
  marktanalyseSamenvatting,
  type Sortering,
  type ZoekTransactiesResultaat,
  type MarktanalyseSamenvatting,
} from '@/lib/transactiesQuery'
import type { TransactieFilter } from '@/lib/schemas'
import { PER_PAGINA } from '@/lib/transactiesZoeken'

export type TransactiesData = {
  resultaat: ZoekTransactiesResultaat
  /** Medianen + delta t.o.v. de vorige periode over de VOLLEDIGE filterselectie (niet alleen de paginarijen) — zelfde RPC als de marktanalyse-explorer (item 6.1), hier hergebruikt voor de tegelrij. */
  samenvatting: MarktanalyseSamenvatting
}

/** Eén pagina resultaten + de tegelrij-samenvatting, in één trip — beide op dezelfde filters. */
export async function haalTransactiesData(
  filters: TransactieFilter,
  sortering: Sortering,
  pagina: number,
): Promise<TransactiesData> {
  const supabase = createServerSupabaseClient()
  const [resultaat, samenvatting] = await Promise.all([
    zoekTransacties(supabase, filters, { sortering, limiet: PER_PAGINA, offset: (pagina - 1) * PER_PAGINA }),
    marktanalyseSamenvatting(supabase, filters),
  ])
  return { resultaat, samenvatting }
}
