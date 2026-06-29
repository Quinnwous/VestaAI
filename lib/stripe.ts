import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder'

export const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: '2026-06-24.dahlia',
})

export const PLAN_PRICES: Record<'solo' | 'kantoor', string> = {
  solo: process.env.STRIPE_PRICE_SOLO!,
  kantoor: process.env.STRIPE_PRICE_KANTOOR!,
}

export const PLAN_NAMES: Record<'solo' | 'kantoor', string> = {
  solo: 'VestaAI Solo',
  kantoor: 'VestaAI Kantoor',
}
