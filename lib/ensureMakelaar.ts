import type { User } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/email'

// Nieuwe accounts krijgen tijdens de gratis-fase automatisch volledige toegang:
// een ruime "trial" (geen betaling nodig, geen limieten). Het platform-admin-
// paneel kan dit per klant aanpassen.
const GRATIS_TOEGANG_DAGEN = 365

/**
 * Zorgt dat de ingelogde gebruiker een makelaar-record (en kantoor) heeft.
 * Dit is de vangnet-versie van app/auth/confirm/route.ts: als de bevestigings-
 * flow het record niet heeft aangemaakt, gebeurt het alsnog bij de eerste
 * ingelogde paginabezoek. Draait met de service-role (omzeilt RLS).
 *
 * @returns true als er (nu) een makelaar-record bestaat.
 */
export async function ensureMakelaar(user: User): Promise<boolean> {
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

  // Nieuw kantoor aanmaken met gratis toegang.
  const kantoorNaam = user.email?.split('@')[1]?.split('.')[0] ?? 'Kantoor'
  const trialEndsAt = new Date(Date.now() + GRATIS_TOEGANG_DAGEN * 24 * 60 * 60 * 1000).toISOString()

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

  if (makelaarError) return false

  sendWelcomeEmail(user.email!, naam).catch(() => {})
  return true
}
