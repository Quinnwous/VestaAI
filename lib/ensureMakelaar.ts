import type { User } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'

/**
 * Zorgt dat een uitgenodigd account zijn makelaar-record krijgt. Vangnet voor
 * het geval de DB-trigger handle_new_user() niet liep (bv. een tijdelijke
 * search_path-bug, zie migratiegeschiedenis).
 *
 * Toegang is sinds 15 sep 2026 puur admin-beheerd (zie CLAUDE.md): dit vangnet
 * koppelt een gebruiker alléén aan het kantoor waarvoor de platform-admin hem
 * heeft uitgenodigd (`user_metadata.kantoor_id`, gezet door
 * `auth.admin.createUser`/`inviteUserByEmail`). Zonder die uitnodiging wordt
 * er — anders dan vroeger — geen nieuw kantoor met proefperiode aangemaakt;
 * zo'n account blijft "wordt klaargezet" tonen totdat een admin het koppelt.
 *
 * @returns true als er (nu) een makelaar-record bestaat.
 */
export async function ensureMakelaar(user: User): Promise<boolean> {
  // Platform-admins zijn geen klant en krijgen dus geen kantoor/makelaar-record.
  if (isPlatformAdmin(user.email)) return false

  const service = createServiceSupabaseClient()

  const { data: bestaand } = await service
    .from('makelaars')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (bestaand) return true

  const uitgenodigdVoorKantoorId = user.user_metadata?.kantoor_id as string | undefined
  if (!uitgenodigdVoorKantoorId) return false

  const emailNaam = user.email?.split('@')[0] ?? 'Makelaar'
  const naam = emailNaam.charAt(0).toUpperCase() + emailNaam.slice(1)
  const rol = (user.user_metadata?.role as 'admin' | 'makelaar' | undefined) ?? 'makelaar'

  const { error } = await service.from('makelaars').insert({
    id: user.id,
    kantoor_id: uitgenodigdVoorKantoorId,
    name: naam,
    email: user.email!,
    role: rol,
  })
  return !error
}
