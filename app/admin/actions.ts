'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { sendAccountToegevoegdEmail } from '@/lib/email'
import { distilleerStijlprofiel } from '@/lib/claude'
import type { HuisstijlConfig, KantoorInstellingen } from '@/lib/schemas'
import { HuisstijlSchema, KantoorInstellingenSchema } from '@/lib/schemas'

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

  const { data: kantoor } = await service.from('kantoren').select('name, huisstijl_json').eq('id', data.kantoorId).single()
  const kantoorKleur = (kantoor?.huisstijl_json as { primaire_kleur?: string } | null)?.primaire_kleur ?? null
  try {
    await sendAccountToegevoegdEmail(data.email, data.naam, kantoor?.name ?? 'VestaAI', kantoorKleur)
  } catch {
    // best-effort
  }

  revalidatePath('/admin')
  return { ok: true }
}

/**
 * Verwijdert een teamlid uit een kantoor. Team- en huisstijlbeheer zijn sinds
 * 16 sep 2026 volledig platform-admin-beheerd (één rol per kantoor, zie
 * CLAUDE.md) — dit vervangt de oude, kantoor-zelfbeheerde `verwijderTeamlid`.
 */
export async function verwijderMakelaar(makelaarId: string, kantoorId: string): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const service = createServiceSupabaseClient()
  const { error } = await service.from('makelaars').delete().eq('id', makelaarId).eq('kantoor_id', kantoorId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/admin/kantoor/${kantoorId}`)
  return { ok: true }
}

export async function uploadLogoAlsAdmin(formData: FormData): Promise<Result & { url?: string }> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }

  const file = formData.get('logo') as File | null
  const kantoorId = formData.get('kantoor_id') as string | null
  if (!file || !kantoorId || file.size === 0) return { ok: false, error: 'Ongeldig bestand' }

  const TOEGESTANE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!TOEGESTANE_TYPES.includes(file.type)) return { ok: false, error: 'Alleen PNG, JPG, SVG of WebP toegestaan' }
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Bestand mag maximaal 2 MB zijn' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const pad = `${kantoorId}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const service = createServiceSupabaseClient()
  const { error: uploadError } = await service.storage.from('kantoor-assets').upload(pad, bytes, { contentType: file.type, upsert: true })
  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: urlData } = service.storage.from('kantoor-assets').getPublicUrl(pad)
  await service.from('kantoren').update({ logo_url: urlData.publicUrl }).eq('id', kantoorId)

  revalidatePath(`/admin/kantoor/${kantoorId}`)
  return { ok: true, url: urlData.publicUrl }
}

export async function uploadAchtergrondAlsAdmin(formData: FormData): Promise<Result & { url?: string }> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }

  const file = formData.get('achtergrond') as File | null
  const kantoorId = formData.get('kantoor_id') as string | null
  const slot = formData.get('slot') === 'secundair' ? 'secundair' : 'primair'
  if (!file || !kantoorId || file.size === 0) return { ok: false, error: 'Ongeldig bestand' }

  const TOEGESTANE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
  if (!TOEGESTANE_TYPES.includes(file.type)) return { ok: false, error: 'Alleen PNG, JPG of WebP toegestaan' }
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'Bestand mag maximaal 5 MB zijn' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const pad = `${kantoorId}/achtergrond-${slot}.${ext}`
  const bytes = await file.arrayBuffer()

  const service = createServiceSupabaseClient()
  const { error: uploadError } = await service.storage.from('kantoor-assets').upload(pad, bytes, { contentType: file.type, upsert: true })
  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: urlData } = service.storage.from('kantoor-assets').getPublicUrl(pad)
  const { data: kantoor } = await service.from('kantoren').select('huisstijl_json').eq('id', kantoorId).single()
  const veld = slot === 'secundair' ? 'achtergrond_secundair_url' : 'achtergrond_url'
  await service.from('kantoren').update({ huisstijl_json: { ...(kantoor?.huisstijl_json ?? {}), [veld]: urlData.publicUrl } }).eq('id', kantoorId)

  revalidatePath(`/admin/kantoor/${kantoorId}`)
  return { ok: true, url: urlData.publicUrl }
}

/** Huisstijl opslaan namens een kantoor — volledige vervanger van de oude, kantoor-zelfbeheerde `slaHuisstijlOp`. */
export async function slaHuisstijlOpAlsAdmin(data: HuisstijlConfig & { kantoor_id: string }): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  try {
    const { kantoor_id, ...rest } = data
    const huisstijl = HuisstijlSchema.parse(rest)

    const broVoorbeelden = huisstijl.brochure_stijl?.voorbeelden?.filter(Boolean) ?? []
    const [stijlprofiel, brochureStijlprofiel] = await Promise.all([
      huisstijl.voorbeelden.filter(Boolean).length
        ? distilleerStijlprofiel(huisstijl.voorbeelden, huisstijl.schrijftoon, huisstijl.slogan).catch(() => '')
        : Promise.resolve(''),
      broVoorbeelden.length
        ? distilleerStijlprofiel(broVoorbeelden, huisstijl.schrijftoon, huisstijl.slogan).catch(() => '')
        : Promise.resolve(''),
    ])

    const brochure_stijl = huisstijl.brochure_stijl
      ? { ...huisstijl.brochure_stijl, ...(brochureStijlprofiel ? { stijlprofiel: brochureStijlprofiel } : {}) }
      : undefined

    const service = createServiceSupabaseClient()
    const { data: bestaand } = await service.from('kantoren').select('huisstijl_json').eq('id', kantoor_id).single()
    const bestaandeHuisstijl = (bestaand?.huisstijl_json ?? {}) as Partial<HuisstijlConfig>

    const { error } = await service
      .from('kantoren')
      .update({
        huisstijl_json: {
          ...bestaandeHuisstijl,
          ...huisstijl,
          ...(stijlprofiel ? { stijlprofiel } : {}),
          ...(brochure_stijl ? { brochure_stijl } : {}),
        },
      })
      .eq('id', kantoor_id)

    if (error) return { ok: false, error: error.message }
    revalidatePath(`/admin/kantoor/${kantoor_id}`)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Validatiefout' }
  }
}

/** Courtage, kantoorprofiel en werkgebied — zie lib/schemas.ts KantoorInstellingenSchema. */
export async function slaKantoorInstellingenOp(kantoorId: string, data: KantoorInstellingen): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  try {
    const instellingen = KantoorInstellingenSchema.parse(data)
    const service = createServiceSupabaseClient()
    const { error } = await service.from('kantoren').update({ instellingen_json: instellingen }).eq('id', kantoorId)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/admin/kantoor/${kantoorId}`)
    revalidatePath('/kantoor')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Validatiefout' }
  }
}

export async function slaKantoorNaamOpAlsAdmin(kantoorId: string, naam: string): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  if (!naam.trim() || naam.length > 100) return { ok: false, error: 'Ongeldige naam' }
  const service = createServiceSupabaseClient()
  const { error } = await service.from('kantoren').update({ name: naam.trim() }).eq('id', kantoorId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/admin/kantoor/${kantoorId}`)
  revalidatePath('/admin')
  return { ok: true }
}
