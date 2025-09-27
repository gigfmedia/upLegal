-- Add Stripe-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_stripe_account_id_idx ON public.profiles (stripe_account_id);

-- Add comment to explain the status values
COMMENT ON COLUMN public.profiles.stripe_account_status IS 'Stripe account status: unverified, pending, verified, rejected';

-- Add comment to explain the Stripe account ID
COMMENT ON COLUMN public.profiles.stripe_account_id IS 'Stripe Connect account ID for this user';
