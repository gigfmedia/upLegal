-- Remove Stripe-related columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS stripe_account_id,
DROP COLUMN IF EXISTS stripe_account_status,
DROP COLUMN IF EXISTS stripe_charges_enabled,
DROP COLUMN IF EXISTS stripe_payouts_enabled,
DROP COLUMN IF EXISTS stripe_dashboard_url;

-- Drop the index for Stripe account ID
DROP INDEX IF EXISTS public.profiles_stripe_account_id_idx;
