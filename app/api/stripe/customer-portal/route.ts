import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, kantoren(stripe_id)')
    .eq('id', user.id)
    .single()

  const kantoorData = makelaar?.kantoren as unknown as { stripe_id: string | null } | null
  const stripeCustomerId = kantoorData?.stripe_id

  if (!stripeCustomerId) {
    return NextResponse.redirect(new URL('/settings?error=no_subscription', req.url))
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  })

  return NextResponse.redirect(session.url)
}
