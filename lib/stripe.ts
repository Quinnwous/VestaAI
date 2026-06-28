import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
