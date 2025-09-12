import { buffer } from 'micro';
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'No signature' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Error processing webhook' });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent as string;
  const clientUserId = session.metadata?.client_user_id;
  const lawyerUserId = session.metadata?.lawyer_user_id;
  const platformFee = parseInt(session.metadata?.platform_fee || '0');
  const lawyerAmount = parseInt(session.metadata?.lawyer_amount || '0');
  const totalAmount = session.amount_total || 0;

  // Update payment record in database
  await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_payment_intent_id: paymentIntent,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_session_id', session.id);

  // Send confirmation emails, notifications, etc.
  // ...
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Update payment record with payment intent details
  await supabase
    .from('payments')
    .update({
      status: 'completed',
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  // Update payment record with transfer details
  await supabase
    .from('payments')
    .update({
      stripe_transfer_id: transfer.id,
      transfer_status: transfer.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', transfer.payment_intent as string);
}

async function handleAccountUpdated(account: Stripe.Account) {
  // Update lawyer's account status when their Stripe account is updated
  await supabase
    .from('profiles')
    .update({
      stripe_account_status: account.details_submitted ? 'complete' : 'pending',
      payout_enabled: account.payouts_enabled || false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);
}
