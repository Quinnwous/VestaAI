import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/email'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'
  const refCode = searchParams.get('ref') ?? null

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
  }

  // Maak de redirect-response eerst aan zodat cookies erop gezet kunnen worden
  const redirectUrl = new URL(next, request.url)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  console.log('[auth/confirm] token_hash:', token_hash?.slice(0, 20) + '...', '| type:', type, '| next:', next)
  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
  console.log('[auth/confirm] verifyOtp error:', error?.message ?? 'none', '| user:', data?.user?.id ?? 'null')

  if (error || !data.user) {
    console.log('[auth/confirm] → redirect to invalid_link')
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

  if (!bestaandeMakelaar) {
    const emailNaam = user.email?.split('@')[0] ?? 'Makelaar'
    const uitgenodigdVoorKantoorId = user.user_metadata?.kantoor_id as string | undefined

    if (uitgenodigdVoorKantoorId) {
      await serviceClient.from('makelaars').insert({
        id: user.id,
        kantoor_id: uitgenodigdVoorKantoorId,
        name: emailNaam.charAt(0).toUpperCase() + emailNaam.slice(1),
        email: user.email!,
        role: 'makelaar',
      })
    } else {
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

        // Verwerk referral: zoek referrer op via code, verleng trial met 30 dagen
        if (refCode) {
          const { data: referrerKantoor } = await serviceClient
            .from('kantoren')
            .select('id')
            .eq('referral_code', refCode.toUpperCase())
            .neq('id', nieuwKantoor.id)
            .single()

          if (referrerKantoor) {
            const nieuweTrialEinddatum = new Date(Date.now() + 44 * 24 * 60 * 60 * 1000).toISOString()
            await Promise.all([
              // Verleng trial referee met extra 30 dagen (14 + 30 = 44 dagen totaal)
              serviceClient
                .from('kantoren')
                .update({ trial_ends_at: nieuweTrialEinddatum })
                .eq('id', nieuwKantoor.id),
              // Sla referral op — beloning voor referrer wordt later verwerkt
              serviceClient
                .from('referrals')
                .upsert({
                  referrer_kantoor_id: referrerKantoor.id,
                  referee_kantoor_id: nieuwKantoor.id,
                  reward_applied: false,
                }, { onConflict: 'referee_kantoor_id', ignoreDuplicates: true }),
            ])
          }
        }

        sendWelcomeEmail(user.email!, emailNaam).catch(console.error)
      }
    }
  }

  return response
}
