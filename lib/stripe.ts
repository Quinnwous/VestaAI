import Stripe from 'stripe'

let _instance: Stripe | null = null

function getInstance(): Stripe {
  if (!_instance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _instance = new Stripe(key, { apiVersion: '2026-06-24.dahlia' })
  }
  return _instance
}

// Lazy Proxy: initializes Stripe on first property access, not at import time.
// This prevents build errors when STRIPE_SECRET_KEY is not set locally.
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    return getInstance()[prop as keyof Stripe]
  },
})

export const PLAN_PRICES: Record<'starter' | 'pro' | 'kantoor', string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
  kantoor: process.env.STRIPE_PRICE_KANTOOR!,
}

export const PLAN_NAMES: Record<'starter' | 'pro' | 'kantoor', string> = {
  starter: 'VestaAI Starter',
  pro: 'VestaAI Pro',
  kantoor: 'VestaAI Kantoor',
}
