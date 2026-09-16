'use server'

import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { WachtwoordWijzigenSchema } from '@/lib/schemas'

/**
 * Enige zelfbeheer-acties op /account (masterplan fase 1.7, zie
 * docs/roadmap.md): eigen naam en wachtwoord. Verhuisd vanuit de
 * kantoorpagina (app/(app)/kantoor/actions.ts) — die is sinds 16 sep 2026
 * platform-admin-beheerd op elk ander vlak, en toont nu alleen nog
 * kantoorinformatie ter inzage.
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

/**
 * Wachtwoord wijzigen: verifieert eerst het huidige wachtwoord met
 * `signInWithPassword` (geen sessie-mutatie zonder dat de gebruiker het
 * huidige wachtwoord aantoonbaar kent), en zet daarna het nieuwe wachtwoord
 * via `auth.updateUser`.
 */
export async function wijzigWachtwoord(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = WachtwoordWijzigenSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Ongeldige invoer' }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, error: 'Niet ingelogd' }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.huidigWachtwoord,
  })
  if (verifyError) return { ok: false, error: 'Huidig wachtwoord klopt niet' }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.nieuwWachtwoord,
  })
  if (updateError) return { ok: false, error: updateError.message }

  return { ok: true }
}
