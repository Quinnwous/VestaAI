import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { TransactiesZoeken } from '@/components/TransactiesZoeken'
import type { TransactieRow } from '@/lib/supabase'

export const metadata = { title: 'Transacties opzoeken' }

/**
 * Transacties opzoeken — losse zoekfunctie over de transactiedataset, los van
 * de geaggregeerde grafieken in Marktanalyse (zie CLAUDE.md § Hoofdstructuur).
 */
export default async function TransactiesPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) redirect('/login')

  const { data: transacties } = await supabase
    .from('transacties')
    .select('*')
    .eq('kantoor_id', makelaar.kantoor_id)
    .order('verkoopdatum', { ascending: false })

  return <TransactiesZoeken transacties={(transacties ?? []) as TransactieRow[]} />
}
