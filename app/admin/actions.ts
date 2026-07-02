'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'

type Result = { ok: true } | { ok: false; error: string }

async function vereisPlatformAdmin(): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isPlatformAdmin(user?.email)
}

type Plan = 'starter' | 'pro' | 'kantoor' | null

export async function setPlan(kantoorId: string, plan: Plan): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const service = createServiceSupabaseClient()
  const { error } = await service.from('kantoren').update({ plan }).eq('id', kantoorId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

/** Geeft een kantoor gratis toegang: geen plan (dus geen limieten) + ruime trial. */
export async function grantGratisToegang(kantoorId: string, dagen = 3650): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const service = createServiceSupabaseClient()
  const trialEndsAt = new Date(Date.now() + dagen * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await service
    .from('kantoren')
    .update({ plan: null, trial_ends_at: trialEndsAt })
    .eq('id', kantoorId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

/** Activeert/deactiveert een kantoor door alle gebruikers te (de)bannen. Omkeerbaar. */
export async function setActief(kantoorId: string, actief: boolean): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const service = createServiceSupabaseClient()
  const { data: leden, error: ledenError } = await service
    .from('makelaars')
    .select('id')
    .eq('kantoor_id', kantoorId)
  if (ledenError) return { ok: false, error: ledenError.message }

  const banDuration = actief ? 'none' : '876000h' // ~100 jaar = effectief geblokkeerd
  for (const lid of leden ?? []) {
    const { error } = await service.auth.admin.updateUserById(lid.id, { ban_duration: banDuration })
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath('/admin')
  return { ok: true }
}
