import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, refreshUrl, returnUrl } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Check if user already has a connected account
    if (profile.stripe_account_id) {
      // Generate account link for existing account
      const accountLink = await stripe.accountLinks.create({
        account: profile.stripe_account_id,
        refresh_url: refreshUrl || `${Deno.env.get('SITE_URL')}/dashboard/settings`,
        return_url: returnUrl || `${Deno.env.get('SITE_URL')}/dashboard/settings`,
        type: 'account_onboarding',
      });

      return new Response(
        JSON.stringify({ url: accountLink.url, accountId: profile.stripe_account_id }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create new connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CL',
      email: profile.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: '8111', // Legal services
        product_description: 'Servicios legales a través de UpLegal',
      },
      individual: {
        email: profile.email,
        first_name: profile.full_name?.split(' ')[0],
        last_name: profile.full_name?.split(' ').slice(1).join(' '),
      },
    });

    // Generate account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl || `${Deno.env.get('SITE_URL')}/dashboard/settings`,
      return_url: returnUrl || `${Deno.env.get('SITE_URL')}/dashboard/settings`,
      type: 'account_onboarding',
    });

    // Save Stripe account ID to profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile with Stripe account ID:', updateError);
      throw new Error('Failed to update user profile');
    }

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId: account.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
