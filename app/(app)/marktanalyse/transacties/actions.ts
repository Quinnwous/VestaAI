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
import { zoekTransacties, type Sortering, type ZoekTransactiesResultaat } from '@/lib/transactiesQuery'
import type { TransactieFilter } from '@/lib/schemas'
import { PER_PAGINA } from '@/lib/transactiesZoeken'

export async function haalTransactiesPagina(
  filters: TransactieFilter,
  sortering: Sortering,
  pagina: number,
): Promise<ZoekTransactiesResultaat> {
  const supabase = createServerSupabaseClient()
  return zoekTransacties(supabase, filters, { sortering, limiet: PER_PAGINA, offset: (pagina - 1) * PER_PAGINA })
}
