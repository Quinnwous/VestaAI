import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ConcurrentieExplorer } from '@/components/ConcurrentieExplorer'
import type { TransactieRow } from '@/lib/supabase'

export const metadata = { title: 'Concurrentieanalyse' }

/**
 * Concurrentieanalyse — eigen kantoor vs. concurrenten in de regio (zie
 * CLAUDE.md § Hoofdstructuur). Draait op `verkopend_kantoor` in dezelfde
 * transactiedataset als de waardering, zodra dat veld gevuld is; anders een
 * eerlijke lege staat i.p.v. misleidende cijfers (zie ConcurrentieExplorer).
 */
export default async function ConcurrentieAnalysePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) redirect('/login')

  const { data: transacties } = await supabase
    .from('transacties')
    .select('*')
    .eq('kantoor_id', makelaar.kantoor_id)

  return <ConcurrentieExplorer transacties={(transacties ?? []) as TransactieRow[]} />
}
