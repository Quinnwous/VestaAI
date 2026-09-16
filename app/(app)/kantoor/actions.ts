'use server'

import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

/**
 * De enige zelfbeheer-actie die op deze read-only kantoorpagina overblijft:
 * je eigen weergavenaam. Alle overige kantoorinstellingen (huisstijl, team,
 * courtage, profiel) zijn sinds 16 sep 2026 platform-admin-beheerd — zie
 * app/admin/actions.ts.
 */
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
