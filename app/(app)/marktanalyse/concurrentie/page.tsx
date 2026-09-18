import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ConcurrentieExplorer } from '@/components/ConcurrentieExplorer'
import { haalTransactiesVoorVerkenner, ALLE_TRANSACTIE_KOLOMMEN } from '@/lib/transactiesQuery'
import type { TransactieRow } from '@/lib/supabase'

export const metadata = { title: 'Concurrentieanalyse' }

/**
 * Concurrentieanalyse — eigen kantoor vs. concurrenten in de regio (zie
 * CLAUDE.md § Hoofdstructuur). Draait op `verkopend_kantoor` in dezelfde
 * transactiedataset als de waardering, zodra dat veld gevuld is; anders een
 * eerlijke lege staat i.p.v. misleidende cijfers (zie ConcurrentieExplorer).
 *
 * Tussenfase (item 2.2): de RPC's `concurrentie_marktaandeel`/
 * `concurrentie_segmenten` zijn gebouwd en getest, maar deze pagina houdt
 * voorlopig `ConcurrentieExplorer`'s bestaande client-side aggregatie aan —
 * alleen de databron wisselt naar `haalTransactiesVoorVerkenner` (geen
 * 1.000-rijen-plafond meer).
 */
export default async function ConcurrentieAnalysePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) redirect('/login')

  const transacties = await haalTransactiesVoorVerkenner<TransactieRow>(supabase, ALLE_TRANSACTIE_KOLOMMEN)

  return <ConcurrentieExplorer transacties={transacties} />
}
