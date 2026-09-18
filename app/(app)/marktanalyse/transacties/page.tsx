import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { TransactiesZoeken } from '@/components/TransactiesZoeken'
import { haalTransactiesVoorVerkenner, ALLE_TRANSACTIE_KOLOMMEN } from '@/lib/transactiesQuery'
import type { TransactieRow } from '@/lib/supabase'

export const metadata = { title: 'Transacties opzoeken' }

/**
 * Transacties opzoeken — losse zoekfunctie over de transactiedataset, los van
 * de geaggregeerde grafieken in Marktanalyse (zie CLAUDE.md § Hoofdstructuur).
 *
 * Tussenfase (item 2.2, docs/roadmap.md § 3.1): `TransactiesZoeken` filtert
 * nu nog volledig client-side op een array-prop (eigen state, geen
 * URL-parameters) — overschakelen op de gepagineerde RPC `transacties_zoeken`
 * (server-side filters/sortering/pagina in de URL) vraagt een UI-herbouw die
 * bewust is uitgesteld tot de visuele v2 (fase 6). Voor nu lost
 * `haalTransactiesVoorVerkenner` het PostgREST-plafond van 1.000 rijen op
 * zonder de component aan te raken; de RPC zelf is al gebouwd en getest.
 */
export default async function TransactiesPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) redirect('/login')

  const transacties = await haalTransactiesVoorVerkenner<TransactieRow>(supabase, ALLE_TRANSACTIE_KOLOMMEN)

  return <TransactiesZoeken transacties={transacties} />
}
