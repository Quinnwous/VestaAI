import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLAN_PRICES, PLAN_NAMES } from '@/lib/stripe'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const plan = searchParams.get('plan') as 'solo' | 'kantoor' | null

  if (!plan || !['solo', 'kantoor'].includes(plan)) {
    return NextResponse.json({ error: 'Ongeldig plan' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, kantoren(stripe_id, name)')
    .eq('id', user.id)
    .single()

  if (!makelaar) {
    return NextResponse.json({ error: 'Kantoor niet gevonden' }, { status: 404 })
  }

  const kantoorData = makelaar.kantoren as unknown as { stripe_id: string | null; name: string } | null
  let stripeCustomerId = kantoorData?.stripe_id

  // Maak Stripe customer aan als die er nog niet is
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: kantoorData?.name,
      metadata: { kantoor_id: makelaar.kantoor_id },
    })
    stripeCustomerId = customer.id

    const serviceClient = createServiceSupabaseClient()
    await serviceClient
      .from('kantoren')
      .update({ stripe_id: stripeCustomerId })
      .eq('id', makelaar.kantoor_id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card', 'ideal'],
    line_items: [{ price: PLAN_PRICES[plan], quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/betaling-gelukt?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    metadata: { kantoor_id: makelaar.kantoor_id, plan },
    subscription_data: {
      metadata: { kantoor_id: makelaar.kantoor_id, plan },
    },
  })

  return NextResponse.redirect(session.url!)
}
