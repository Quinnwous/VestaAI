'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { moetActiveringsmailSturen, PLAN_LABELS } from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import { sendAccountGeactiveerdEmail } from '@/lib/email'

type Result = { ok: true } | { ok: false; error: string }

async function vereisPlatformAdmin(): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isPlatformAdmin(user?.email)
}

/**
 * Mailt de kantoor-admin dat het account actief is. Een mailfout mag een
 * toewijzing nooit laten falen — daarom try/catch zonder foutpropagatie.
 */
async function stuurActiveringsmail(
  service: ReturnType<typeof createServiceSupabaseClient>,
  kantoorId: string,
  planLabel: string,
): Promise<void> {
  try {
    const { data: leden } = await service
      .from('makelaars')
      .select('name, email, role')
      .eq('kantoor_id', kantoorId)
    const ontvanger = leden?.find(l => l.role === 'admin') ?? leden?.[0]
    if (ontvanger) await sendAccountGeactiveerdEmail(ontvanger.email, ontvanger.name, planLabel)
  } catch {
    // best-effort
  }
}

/**
 * Wijs een plan toe ('gratis' incluis) of zet terug naar proef-/verlopen-status
 * met null. Bij de overgang géén toegang → wél toegang gaat er automatisch een
 * activeringsmail naar de kantoor-admin; planwissels blijven stil.
 */
export async function setPlan(kantoorId: string, plan: Plan | null): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const service = createServiceSupabaseClient()

  const { data: voor } = await service
    .from('kantoren')
    .select('plan, trial_ends_at')
    .eq('id', kantoorId)
    .single()

  // Plan gezet → proefdatum wissen (het plan bepaalt de toegang); terug naar
  // null laat een eventueel lopende proefperiode ongemoeid.
  const update = plan ? { plan, trial_ends_at: null } : { plan: null }
  const { error } = await service.from('kantoren').update(update).eq('id', kantoorId)
  if (error) return { ok: false, error: error.message }

  if (voor && plan && moetActiveringsmailSturen(
    { plan: voor.plan, trialEndsAt: voor.trial_ends_at },
    { plan, trialEndsAt: null },
  )) {
    await stuurActiveringsmail(service, kantoorId, PLAN_LABELS[plan])
  }

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
