import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map Stripe price IDs to membership levels
// Replace these with your actual Price IDs
const PRICE_TO_MEMBERSHIP: Record<string, string> = {
  'price_1SwcFWCeca9TSF9AWfCnn2yk': 'contributing',
  'price_1SwcJeCeca9TSF9AetEiWuUB': 'founding',
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('Webhook event received:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const membershipLevel = session.metadata?.membershipLevel

        console.log('Processing checkout for user:', userId, 'level:', membershipLevel)

        if (userId && membershipLevel) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              membership_level: membershipLevel,
              subscription_status: 'active',
              subscription_ends_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          if (error) {
            console.error('Failed to update membership:', error)
          } else {
            console.log(`Updated user ${userId} to ${membershipLevel} membership`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id

        console.log('Subscription updated:', subscription.id, 'price:', priceId)

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        
        if (!customer.email) {
          console.error('No email found for customer:', customerId)
          break
        }

        // Check if subscription is set to cancel at period end
        if (subscription.cancel_at_period_end) {
          // Use type assertion to access current_period_end
          const subscriptionData = subscription as any
          const endsAt = new Date(subscriptionData.current_period_end * 1000)
          console.log(`Subscription for ${customer.email} will cancel on ${endsAt.toISOString()}`)

          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'canceling',
              subscription_ends_at: endsAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('email', customer.email)

          if (error) {
            console.error('Failed to update cancellation status:', error)
          } else {
            console.log(`Marked subscription as canceling for ${customer.email}, ends ${endsAt.toISOString()}`)
          }
        } else {
          // Subscription is active (not canceling) - might be a plan change
          const newMembershipLevel = PRICE_TO_MEMBERSHIP[priceId]

          if (newMembershipLevel) {
            const { error } = await supabaseAdmin
              .from('profiles')
              .update({
                membership_level: newMembershipLevel,
                subscription_status: 'active',
                subscription_ends_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq('email', customer.email)

            if (error) {
              console.error('Failed to update membership on subscription change:', error)
            } else {
              console.log(`Updated subscription to ${newMembershipLevel} for ${customer.email}`)
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Subscription cancelled:', subscription.id)

        // Downgrade to free
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        
        if (customer.email) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              membership_level: 'free',
              subscription_status: 'cancelled',
              subscription_ends_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('email', customer.email)

          if (error) {
            console.error('Failed to downgrade membership:', error)
          } else {
            console.log(`Downgraded ${customer.email} to free membership`)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}