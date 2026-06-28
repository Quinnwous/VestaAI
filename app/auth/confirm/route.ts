import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/email'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
  }

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
  }

  const user = data.user

  // Controleer of de gebruiker al een makelaar-record heeft
  const serviceClient = createServiceSupabaseClient()
  const { data: bestaandeMakelaar } = await serviceClient
    .from('makelaars')
    .select('id')
    .eq('id', user.id)
    .single()

  // Nieuwe gebruiker: automatisch kantoor + makelaar aanmaken
  if (!bestaandeMakelaar) {
    const emailNaam = user.email?.split('@')[0] ?? 'Makelaar'
    const kantoorNaam = user.email?.split('@')[1]?.split('.')[0] ?? 'Kantoor'
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: nieuwKantoor } = await serviceClient
      .from('kantoren')
      .insert({
        name: kantoorNaam.charAt(0).toUpperCase() + kantoorNaam.slice(1),
        trial_ends_at: trialEndsAt,
      })
      .select('id')
      .single()

    if (nieuwKantoor) {
      await serviceClient.from('makelaars').insert({
        id: user.id,
        kantoor_id: nieuwKantoor.id,
        name: emailNaam.charAt(0).toUpperCase() + emailNaam.slice(1),
        email: user.email!,
        role: 'admin',
      })

      // Welkomstmail sturen (niet-blokkerend)
      sendWelcomeEmail(user.email!, emailNaam).catch(console.error)
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
