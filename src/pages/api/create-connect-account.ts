import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
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
      console.error('Error fetching profile:', profileError);
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

    // Create new connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CL',
      email: user.email,
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
        email: user.email,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
      },
    });

    // Generate account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/payments`,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/payments`,
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
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    return res.status(200).json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return res.status(500).json({ 
      error: error.message || 'Error creating Stripe Connect account' 
    });
  }
}
