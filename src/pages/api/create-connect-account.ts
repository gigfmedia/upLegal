import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil', // Latest version that matches the type definitions
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, refreshUrl, returnUrl } = req.body;
    const { authorization } = req.headers;

    // Verify user is authenticated
    const token = authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user already has a connected account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Error fetching user profile' });
    }

    if (profile?.stripe_account_id) {
      // Generate account link for existing account
      const accountLink = await stripe.accountLinks.create({
        account: profile.stripe_account_id,
        refresh_url: refreshUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/payments`,
        return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/payments`,
        type: 'account_onboarding',
      });

      return res.status(200).json({ url: accountLink.url });
    }

    // Create new connected account with 80/20 revenue split
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CL',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        // Remove card_payments as it's not supported in Chile
        transfers: { requested: true },
      },
      business_profile: {
        mcc: '8111', // Legal services
        product_description: 'Servicios legales a través de LegalUp',
      },
      individual: {
        email: user.email,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
      },
      // Set default platform fees to 20% (80/20 split)
      settings: {
        payouts: {
          schedule: {
            interval: 'manual', // Platform will trigger payouts manually
          },
        },
      },
    });

    // Generate account link for onboarding with bank account collection
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/payments`,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/payments?success=true`,
      type: 'account_onboarding',
      collect: 'currently_due',
    });

    // Create a transfer schedule for the 80/20 split
    await stripe.accounts.update(account.id, {
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
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
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    return res.status(200).json({ url: accountLink.url });
  } catch (error) {
    return res.status(500).json({ 
      error: error.message || 'Error creating Stripe Connect account' 
    });
  }
}
