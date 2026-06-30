'use server'

import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import type { HuisstijlConfig } from '@/lib/schemas'
import { HuisstijlSchema } from '@/lib/schemas'
import { sendTeamInviteConfirmation } from '@/lib/email'

export async function uploadLogo(formData: FormData) {
  const file = formData.get('logo') as File | null
  const kantoorId = formData.get('kantoor_id') as string | null

  if (!file || !kantoorId || file.size === 0) {
    return { ok: false, error: 'Ongeldig bestand' }
  }

  const TOEGESTANE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!TOEGESTANE_TYPES.includes(file.type)) {
    return { ok: false, error: 'Alleen PNG, JPG, SVG of WebP toegestaan' }
  }

  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: 'Bestand mag maximaal 2 MB zijn' }
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('role, kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar || makelaar.role !== 'admin' || makelaar.kantoor_id !== kantoorId) {
    return { ok: false, error: 'Geen rechten' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const pad = `${kantoorId}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const serviceClient = createServiceSupabaseClient()

  const { error: uploadError } = await serviceClient.storage
    .from('kantoor-assets')
    .upload(pad, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: urlData } = serviceClient.storage
    .from('kantoor-assets')
    .getPublicUrl(pad)

  await serviceClient
    .from('kantoren')
    .update({ logo_url: urlData.publicUrl })
    .eq('id', kantoorId)

  return { ok: true, url: urlData.publicUrl }
}

export async function slaHuisstijlOp(data: HuisstijlConfig & { kantoor_id: string }) {
  try {
    const { kantoor_id, ...rest } = data
    const huisstijl = HuisstijlSchema.parse(rest)

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Niet ingelogd' }

    const { data: makelaar } = await supabase
      .from('makelaars')
      .select('role, kantoor_id')
      .eq('id', user.id)
      .single()

    if (!makelaar || makelaar.role !== 'admin' || makelaar.kantoor_id !== kantoor_id) {
      return { ok: false, error: 'Geen rechten' }
    }

    const serviceClient = createServiceSupabaseClient()
    const { error } = await serviceClient
      .from('kantoren')
      .update({ huisstijl_json: huisstijl })
      .eq('id', kantoor_id)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Validatiefout' }
  }
}

export async function nodigTeamlidUit(data: { email: string; kantoor_id: string }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('role, kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar || makelaar.role !== 'admin' || makelaar.kantoor_id !== data.kantoor_id) {
    return { ok: false, error: 'Geen rechten' }
  }

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient.auth.admin.inviteUserByEmail(data.email, {
    data: { kantoor_id: data.kantoor_id },
  })

  if (error) return { ok: false, error: error.message }

  // Bevestigingsmail naar de admin (niet-blokkerend)
  if (user.email) {
    sendTeamInviteConfirmation(user.email, data.email).catch(console.error)
  }

  return { ok: true }
}

export async function slaKantoorNaamOp(naam: string) {
  if (!naam.trim() || naam.length > 100) return { ok: false, error: 'Ongeldige naam' }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, role')
    .eq('id', user.id)
    .single()
  if (!makelaar || makelaar.role !== 'admin') return { ok: false, error: 'Geen rechten' }

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('kantoren')
    .update({ name: naam.trim() })
    .eq('id', makelaar.kantoor_id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function slaProfielNaamOp(naam: string) {
  if (!naam.trim() || naam.length > 100) return { ok: false, error: 'Ongeldige naam' }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('makelaars')
    .update({ name: naam.trim() })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function verwijderTeamlid(data: { makelaar_id: string; kantoor_id: string }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Niet ingelogd' }

  if (data.makelaar_id === user.id) {
    return { ok: false, error: 'U kunt uzelf niet verwijderen' }
  }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('role, kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar || makelaar.role !== 'admin' || makelaar.kantoor_id !== data.kantoor_id) {
    return { ok: false, error: 'Geen rechten' }
  }

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('makelaars')
    .delete()
    .eq('id', data.makelaar_id)
    .eq('kantoor_id', data.kantoor_id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
