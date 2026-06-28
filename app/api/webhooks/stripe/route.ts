import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendInvoiceConfirmationEmail } from '@/lib/email'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Ongeldige webhook handtekening' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const kantoorId = session.metadata?.kantoor_id
      const plan = session.metadata?.plan as 'solo' | 'kantoor' | undefined

      if (!kantoorId || !plan) break

      await serviceClient
        .from('kantoren')
        .update({ plan, trial_ends_at: null })
        .eq('id', kantoorId)

      // Factuurbevestiging sturen
      if (session.customer_email && session.amount_total) {
        const planNames = { solo: 'VestaAI Solo', kantoor: 'VestaAI Kantoor' }
        sendInvoiceConfirmationEmail(
          session.customer_email,
          session.customer_details?.name ?? 'Makelaar',
          planNames[plan],
          session.amount_total,
        ).catch(console.error)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const kantoorId = subscription.metadata?.kantoor_id

      if (!kantoorId) break

      await serviceClient
        .from('kantoren')
        .update({ plan: null })
        .eq('id', kantoorId)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const kantoorId = subscription.metadata?.kantoor_id
      const plan = subscription.metadata?.plan as 'solo' | 'kantoor' | undefined

      if (!kantoorId || !plan) break

      if (subscription.status === 'active') {
        await serviceClient
          .from('kantoren')
          .update({ plan, trial_ends_at: null })
          .eq('id', kantoorId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
