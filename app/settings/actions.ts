'use server'

import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import type { HuisstijlConfig } from '@/lib/schemas'
import { HuisstijlSchema } from '@/lib/schemas'

export async function slaHuisstijlOp(data: HuisstijlConfig & { kantoor_id: string }) {
  try {
    const { kantoor_id, ...rest } = data
    const huisstijl = HuisstijlSchema.parse(rest)

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
  return { ok: true }
}
