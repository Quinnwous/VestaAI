'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { sendAccountToegevoegdEmail } from '@/lib/email'

type Result = { ok: true } | { ok: false; error: string }

async function vereisPlatformAdmin(): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isPlatformAdmin(user?.email)
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

/** Nieuw kantoor aanmaken. Toegang is verder puur admin-beheerd: geen plan, geen proefperiode. */
export async function createKantoor(naam: string): Promise<Result & { kantoorId?: string }> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const schoneNaam = naam.trim()
  if (!schoneNaam) return { ok: false, error: 'Naam is verplicht' }

  const service = createServiceSupabaseClient()
  const { data, error } = await service
    .from('kantoren')
    .insert({ name: schoneNaam })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'Aanmaken mislukt' }

  revalidatePath('/admin')
  return { ok: true, kantoorId: data.id }
}

/**
 * Koppelt een net aangemaakte auth-user aan het juiste kantoor. De DB-trigger
 * `handle_new_user()` reageert op élke nieuwe auth-user door een eigen kantoor
 * met proefperiode aan te maken (hij kent `user_metadata.kantoor_id` niet) —
 * dat zetten we hier terug: de makelaar-rij verhuist naar het bedoelde kantoor
 * en het stray-kantoor dat de trigger aanmaakte wordt (indien leeg) opgeruimd.
 */
async function plaatsInKantoor(
  service: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
  kantoorId: string,
  naam: string,
  email: string,
  rol: 'admin' | 'makelaar',
): Promise<Result> {
  const { data: bestaand } = await service
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', userId)
    .maybeSingle()

  if (bestaand) {
    const strayKantoorId = bestaand.kantoor_id !== kantoorId ? bestaand.kantoor_id : null
    const { error } = await service
      .from('makelaars')
      .update({ kantoor_id: kantoorId, name: naam, role: rol })
      .eq('id', userId)
    if (error) return { ok: false, error: error.message }

    if (strayKantoorId) {
      const { count } = await service
        .from('makelaars')
        .select('id', { count: 'exact', head: true })
        .eq('kantoor_id', strayKantoorId)
      if ((count ?? 0) === 0) {
        await service.from('kantoren').delete().eq('id', strayKantoorId)
      }
    }
  } else {
    const { error } = await service.from('makelaars').insert({
      id: userId,
      kantoor_id: kantoorId,
      name: naam,
      email,
      role: rol,
    })
    if (error) return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Zet direct een actief account klaar met een zelfgekozen wachtwoord (geen
 * bevestigingsmail-omweg) — voor de platform-admin zelf of wie anders al een
 * afgesproken wachtwoord heeft. Voor teamleden binnen je eigen kantoor bestaat
 * al `nodigTeamlidUit` (settings/actions.ts, via magic link).
 */
export async function addMakelaarAccount(data: {
  email: string
  naam: string
  wachtwoord: string
  kantoorId: string
  rol: 'admin' | 'makelaar'
}): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  if (data.wachtwoord.length < 8) return { ok: false, error: 'Wachtwoord moet minimaal 8 tekens zijn' }

  const service = createServiceSupabaseClient()
  const { data: created, error } = await service.auth.admin.createUser({
    email: data.email,
    password: data.wachtwoord,
    email_confirm: true,
    user_metadata: { kantoor_id: data.kantoorId, role: data.rol },
  })
  if (error || !created.user) return { ok: false, error: error?.message ?? 'Aanmaken mislukt' }

  const plaatsing = await plaatsInKantoor(service, created.user.id, data.kantoorId, data.naam, data.email, data.rol)
  if (!plaatsing.ok) return plaatsing

  const { data: kantoor } = await service.from('kantoren').select('name').eq('id', data.kantoorId).single()
  try {
    await sendAccountToegevoegdEmail(data.email, data.naam, kantoor?.name ?? 'VestaAI')
  } catch {
    // best-effort
  }

  revalidatePath('/admin')
  return { ok: true }
}
