import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { MarktanalyseExplorer } from '@/components/MarktanalyseExplorer'
import { haalTransactiesVoorVerkenner, ALLE_TRANSACTIE_KOLOMMEN } from '@/lib/transactiesQuery'
import type { TransactieRow } from '@/lib/supabase'

export const metadata = { title: 'Marktanalyse' }

/**
 * Marktanalyse — macro-trends, los van één woning (zie CLAUDE.md §
 * Hoofdstructuur). Interactieve explorer (besluit 16 sep 2026): filters op
 * type/wijk/periode met live hertekenende grafieken, plus segmentvergelijking
 * — zie components/MarktanalyseExplorer.tsx. Draait op de volledige
 * transactiedataset van het kantoor (eigen én overige verkopen).
 *
 * Tussenfase (item 2.2, docs/roadmap.md § 3.1): haalt alle niet-uitgesloten
 * rijen op via `haalTransactiesVoorVerkenner` (range-lus, geen 1.000-rijen-
 * plafond meer) — de RPC's `marktanalyse_reeks`/`marktanalyse_samenvatting`
 * zijn gebouwd en getest, maar deze pagina schakelt er pas op over als de
 * visuele v2 in fase 6 de aggregatie naar Postgres verplaatst.
 */
export default async function MarktanalysePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) redirect('/login')

  const transacties = await haalTransactiesVoorVerkenner<TransactieRow>(supabase, ALLE_TRANSACTIE_KOLOMMEN)

  return <MarktanalyseExplorer transacties={transacties} />
}
