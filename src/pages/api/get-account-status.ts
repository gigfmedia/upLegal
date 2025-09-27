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
    const { userId } = req.body;
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

    // Get user profile with Stripe account ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_account_status, payout_enabled')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(500).json({ error: 'Error fetching user profile' });
    }

    let account = null;
    let loginLink = null;
    let balance = null;
    let payouts = null;

    // Get Stripe account details if connected
    if (profile.stripe_account_id) {
      try {
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
      } catch (error) {
        return res.status(500).json({ 
          error: error.message || 'Error fetching Stripe account details' 
        });
      }
    }

    return res.status(200).json({
      account,
      loginLink: loginLink?.url || null,
      balance,
      recentPayouts: payouts?.data || [],
    });
  } catch (error) {
    return res.status(500).json({ 
      error: error.message || 'Error getting account status' 
    });
  }
}
