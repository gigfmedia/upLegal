import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SERVICE_ROLE_KEY') || ''
)

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  try {
    // Get the signature from the request headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('No signature', { status: 400 })
    }

    // Get the raw body
    const body = await req.text()
    
    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      
      case 'account.application.authorized':
        const appAuthorized = event.data.object as Stripe.Application
        console.log('Application authorized:', appAuthorized.id)
        break
        
      // Add more event types as needed
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in webhook handler:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function handleAccountUpdated(account: Stripe.Account) {
  if (!account.id) return
  
  // Find the user with this Stripe account ID
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_account_id', account.id)
    .single()

  if (error || !profile) {
    console.error('Profile not found for account:', account.id)
    return
  }

  // Update the profile with the account status
  const updates: any = {
    stripe_account_status: account.details_submitted ? 'verified' : 'unverified',
    updated_at: new Date().toISOString()
  }

  // If charges are enabled, update the profile
  if (account.charges_enabled) {
    updates.stripe_charges_enabled = true
  }

  // If payouts are enabled, update the profile
  if (account.payouts_enabled) {
    updates.stripe_payouts_enabled = true
  }

  // Save the updates to the database
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profile.id)

  if (updateError) {
    console.error('Error updating profile:', updateError)
  }
}
