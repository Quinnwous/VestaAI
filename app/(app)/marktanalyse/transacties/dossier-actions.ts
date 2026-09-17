'use server'

import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export type DossierOptie = { id: string; adres: string }

/**
 * Dossiers van het eigen kantoor, voor de "meenemen als referentie"-flow in
 * `TransactiesZoeken.tsx` (item 4.4, docs/roadmap.md § Fase 4): de makelaar
 * kiest hier een dossier om de geselecteerde transacties als handmatige
 * referentie aan toe te voegen (`voegReferentiesToe()` in
 * `app/(app)/object/[id]/waardering-actions.ts`). Alleen id + adres — geen
 * volledige objectrij nodig voor een kiezer.
 */
export async function lijstEigenDossiers(): Promise<DossierOptie[] | { error: string }> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) return { error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const { data, error } = await service
    .from('objecten')
    .select('id, address')
    .eq('kantoor_id', makelaar.kantoor_id)
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) return { error: error.message }

  return (data ?? []).map(o => ({ id: o.id as string, adres: o.address as string }))
}
