import type { User } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { PROEF_DAGEN } from '@/lib/plans'

/**
 * Zorgt dat de ingelogde gebruiker een makelaar-record (en kantoor) heeft.
 * Vangnet voor het geval de DB-trigger handle_new_user() niet liep. Maakt —
 * identiek aan de trigger — aan met een lopende proefperiode (PROEF_DAGEN);
 * de welkomstmail en admin-melding verstuurt lib/nieuweKlant.ts bij het
 * eerste dashboard-bezoek.
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

  const emailNaam = user.email?.split('@')[0] ?? 'Makelaar'
  const naam = emailNaam.charAt(0).toUpperCase() + emailNaam.slice(1)
  const uitgenodigdVoorKantoorId = user.user_metadata?.kantoor_id as string | undefined

  // Uitgenodigd bij een bestaand kantoor → als teamlid toevoegen.
  if (uitgenodigdVoorKantoorId) {
    const { error } = await service.from('makelaars').insert({
      id: user.id,
      kantoor_id: uitgenodigdVoorKantoorId,
      name: naam,
      email: user.email!,
      role: 'makelaar',
    })
    return !error
  }

  // Nieuw kantoor met lopende proefperiode aanmaken.
  const kantoorNaam = user.email?.split('@')[1]?.split('.')[0] ?? 'Kantoor'
  const trialEndsAt = new Date(Date.now() + PROEF_DAGEN * 24 * 60 * 60 * 1000).toISOString()

  const { data: nieuwKantoor, error: kantoorError } = await service
    .from('kantoren')
    .insert({
      name: kantoorNaam.charAt(0).toUpperCase() + kantoorNaam.slice(1),
      trial_ends_at: trialEndsAt,
    })
    .select('id')
    .single()

  if (kantoorError || !nieuwKantoor) return false

  const { error: makelaarError } = await service.from('makelaars').insert({
    id: user.id,
    kantoor_id: nieuwKantoor.id,
    name: naam,
    email: user.email!,
    role: 'admin',
  })

  return !makelaarError
}
