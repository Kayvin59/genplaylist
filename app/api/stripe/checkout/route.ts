import { CREDIT_PACKS, PackType, stripe } from '@/lib/stripe'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate pack type
    const { packType } = (await req.json()) as { packType: string }

    if (!packType || !CREDIT_PACKS[packType as PackType]) {
      return NextResponse.json({ error: 'Invalid pack type' }, { status: 400 })
    }

    const pack = CREDIT_PACKS[packType as PackType]

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let stripeCustomerId = profile?.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)
    }

    // Create one-time checkout session
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [{ price: pack.priceId, quantity: 1 }],
      metadata: {
        supabase_user_id: user.id,
        pack_type: packType,
        credits: String(pack.credits),
      },
      success_url: `${siteUrl}/generate?checkout=success`,
      cancel_url: `${siteUrl}/generate?checkout=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
