import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
})

export const CREDIT_PACKS = {
  starter: { credits: 10, priceId: process.env.STRIPE_STARTER_PRICE_ID! },
  value: { credits: 25, priceId: process.env.STRIPE_VALUE_PRICE_ID! },
  power: { credits: 60, priceId: process.env.STRIPE_POWER_PRICE_ID! },
} as const

export type PackType = keyof typeof CREDIT_PACKS
