import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil', // Latest version that matches the type definitions
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Platform fee percentage (20%)
const PLATFORM_FEE_PERCENT = 20;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, lawyerId } = req.body;

    if (!lawyerId) {
      return res.status(400).json({ error: 'Lawyer ID is required' });
    }

    // Get lawyer's Stripe account ID
    const { data: lawyerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', lawyerId)
      .single();

    if (profileError || !lawyerProfile?.stripe_account_id) {
      return res.status(400).json({ 
        error: 'Lawyer does not have a connected Stripe account' 
      });
    }

    // Calculate amounts
    const amountInCents = Math.round(amount * 100);
    const platformFee = Math.round((amountInCents * PLATFORM_FEE_PERCENT) / 100);
    const lawyerAmount = amountInCents - platformFee;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'clp',
      payment_method_types: ['card'],
      application_fee_amount: platformFee,
      transfer_data: {
        destination: lawyerProfile.stripe_account_id,
      },
      metadata: {
        platform_fee: platformFee.toString(),
        lawyer_amount: lawyerAmount.toString(),
      },
    }, {
      stripeAccount: process.env.STRIPE_ACCOUNT_ID, // Your platform's Stripe account
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      platformFee,
      lawyerAmount,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Error creating payment intent',
      details: errorMessage
    });
  }
}
