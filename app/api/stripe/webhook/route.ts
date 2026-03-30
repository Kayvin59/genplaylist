import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use Supabase admin client (service role) for webhook — no user session available
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event

  // Verify webhook signature — never skip this
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object

        // Only process completed payments
        if (session.payment_status !== 'paid') {
          break
        }

        const userId = session.metadata?.supabase_user_id
        const credits = parseInt(session.metadata?.credits ?? '0', 10)

        if (!userId || credits <= 0) {
          console.error('Webhook: missing user ID or invalid credits in metadata', session.metadata)
          break
        }

        // Increment credits on the user's profile
        const { error } = await supabaseAdmin.rpc('add_credits', {
          user_id: userId,
          amount: credits,
        })

        if (error) {
          console.error('Webhook: failed to add credits:', error)
          return NextResponse.json(
            { error: 'Failed to add credits' },
            { status: 500 }
          )
        }

        console.log(
          `Webhook: added ${credits} credits to user ${userId} (session ${session.id})`
        )
        break
      }

      default:
        // Unhandled event type — log and acknowledge
        console.log(`Webhook: unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
