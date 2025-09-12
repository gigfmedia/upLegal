import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        await handleTransferCreated(transfer);
        break;
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
});

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent as string;
  const clientUserId = session.metadata?.client_user_id;
  const lawyerUserId = session.metadata?.lawyer_user_id;
  const platformFee = parseInt(session.metadata?.platform_fee || '0');
  const lawyerAmount = parseInt(session.metadata?.lawyer_amount || '0');
  const totalAmount = session.amount_total || 0;

  // Update payment record in database
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_payment_intent_id: paymentIntent,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_session_id', session.id);

  if (error) {
    console.error('Error updating payment record:', error);
    throw error;
  }

  // Send confirmation emails, notifications, etc.
  // ...
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Update payment record with payment intent details
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Error updating payment record with payment intent:', error);
    throw error;
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  // Update payment record with transfer details
  const { error } = await supabase
    .from('payments')
    .update({
      stripe_transfer_id: transfer.id,
      transfer_status: transfer.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', transfer.payment_intent as string);

  if (error) {
    console.error('Error updating payment record with transfer:', error);
    throw error;
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  // Update lawyer's account status when their Stripe account is updated
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_account_status: account.details_submitted ? 'complete' : 'pending',
      payout_enabled: account.payouts_enabled || false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);

  if (error) {
    console.error('Error updating lawyer account status:', error);
    throw error;
  }
}
