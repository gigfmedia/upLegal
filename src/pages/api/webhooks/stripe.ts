import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

// Helper to convert stream to buffer
async function buffer(readable: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Utility function to log errors
async function logError(context: string, error: unknown, metadata: Record<string, unknown> = {}) {
  console.error(`[${new Date().toISOString()}] ${context}:`, error, metadata);
  // You can add more sophisticated error logging here
}

// Utility function to send payment confirmation emails
async function sendPaymentConfirmationEmail(
  email: string | null,
  data: { amount: number; serviceId?: string; paymentId?: string }
) {
  if (!email) return;
  
  // Implement your email sending logic here
  console.log(`Sending payment confirmation to ${email}`, data);
  // Example: await sendEmail({ to: email, template: 'payment-confirmation', data });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
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
        // Unhandled event type
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error processing webhook' });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const paymentIntentId = session.payment_intent as string;
  const clientUserId = session.metadata?.client_user_id;
  const lawyerUserId = session.metadata?.lawyer_user_id;
  const platformFee = parseInt(session.metadata?.platform_fee || '0');
  const lawyerAmount = parseInt(session.metadata?.lawyer_amount || '0');
  const totalAmount = session.amount_total || 0;
  const serviceId = session.metadata?.service_id;

  try {
    // Get payment intent to verify the split was applied correctly
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges.data.balance_transaction'],
    });

    // Update payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        stripe_payment_intent_id: paymentIntentId,
        platform_fee: platformFee,
        lawyer_amount: lawyerAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id)
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update lawyer's balance
    if (lawyerUserId) {
      await supabase.rpc('increment_lawyer_balance', {
        lawyer_id: lawyerUserId,
        amount: lawyerAmount,
      });
    }

    // Send email notifications
    await sendPaymentConfirmationEmail(session.customer_email, {
      amount: totalAmount / 100, // Convert back to dollars
      serviceId,
      paymentId: payment?.id,
    });

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    // Log error for monitoring
    await logError('checkout_session_completed', error, {
      sessionId: session.id,
      paymentIntentId,
    });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Get the payment record
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found for intent:', paymentIntent.id);
      return;
    }

    // Update payment record with payment intent details
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
        metadata: {
          ...payment.metadata,
          stripe_status: paymentIntent.status,
          amount_received: paymentIntent.amount_received,
          application_fee_amount: paymentIntent.application_fee_amount,
        }
      })
      .eq('id', payment.id);

    if (updateError) throw updateError;

    // If this is a connected account payment, the transfer will be handled separately
    if (paymentIntent.transfer_data?.destination) {
      console.log(`Payment ${paymentIntent.id} completed for connected account ${paymentIntent.transfer_data.destination}`);
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    await logError('payment_intent_succeeded', error, {
      paymentIntentId: paymentIntent.id,
    });
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    // Update payment record with transfer details
    const { error } = await supabase
      .from('payments')
      .update({
        stripe_transfer_id: transfer.id,
        transfer_status: 'succeeded',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', transfer.destination_payment as string);
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error handling transfer created:', error);
    await logError('transfer_created', error, {
      transferId: transfer.id,
    });
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    // Update lawyer's account status when their Stripe account is updated
    const { error } = await supabase
      .from('profiles')
      .update({
        stripe_account_status: account.details_submitted ? 'active' : 'pending',
        payout_enabled: account.payouts_enabled || false,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', account.id);
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error handling account updated:', error);
    await logError('account_updated', error, {
      accountId: account.id,
    });
  }
}
