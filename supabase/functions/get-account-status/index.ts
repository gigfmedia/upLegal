import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      } 
    });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user profile with Stripe account ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_account_status, payout_enabled')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    let account = null;
    let loginLink = null;
    let balance = null;
    let payouts = null;

    // Get Stripe account details if connected
    if (profile.stripe_account_id) {
      account = await stripe.accounts.retrieve(profile.stripe_account_id);
      
      // Generate login link for Stripe Express dashboard
      loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id);
      
      // Get account balance
      balance = await stripe.balance.retrieve({
        stripeAccount: profile.stripe_account_id,
      });
      
      // Get recent payouts
      payouts = await stripe.payouts.list(
        { limit: 5 },
        { stripeAccount: profile.stripe_account_id }
      );
    }

    return new Response(
      JSON.stringify({
        account,
        loginLink: loginLink?.url,
        balance,
        recentPayouts: payouts?.data,
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error getting account status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 400,
      }
    );
  }
});
