import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { MarktanalyseExplorer } from '@/components/MarktanalyseExplorer'
import type { TransactieRow } from '@/lib/supabase'

export const metadata = { title: 'Marktanalyse' }

/**
 * Marktanalyse — macro-trends, los van één woning (zie CLAUDE.md §
 * Hoofdstructuur). Interactieve explorer (besluit 16 sep 2026): filters op
 * type/wijk/periode met live hertekenende grafieken, plus segmentvergelijking
 * — zie components/MarktanalyseExplorer.tsx. Draait op de volledige
 * transactiedataset van het kantoor (eigen én overige verkopen).
 */
export default async function MarktanalysePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) redirect('/login')

  const { data: transacties } = await supabase
    .from('transacties')
    .select('*')
    .eq('kantoor_id', makelaar.kantoor_id)

  return <MarktanalyseExplorer transacties={(transacties ?? []) as TransactieRow[]} />
}
