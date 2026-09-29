'use server'

/**
 * Server action voor de minikaart in de transactie-sheet (docs/roadmap.md
 * § 9 "Vóór de demo oppakken"): haalt de coördinaat van precies de ene
 * transactie op die open staat in de Sheet van `TransactiesZoeken.tsx` —
 * niet voor de hele pagina, alleen op sheet-open. Enige aanroeper van
 * `haalTransactieCoordinaat()` buiten `lib/transactiesQuery.ts`
 * (guard-test), zelfde patroon als `actions.ts`/`dossier-actions.ts`
 * hiernaast.
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import { haalTransactieCoordinaat, type TransactieCoordinaat } from '@/lib/transactiesQuery'

export async function haalTransactieCoordinaatActie(id: string): Promise<TransactieCoordinaat> {
  const supabase = await createServerSupabaseClient()
  return haalTransactieCoordinaat(supabase, id)
}
