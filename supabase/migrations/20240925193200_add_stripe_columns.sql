-- Add Stripe-related columns to profiles table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'unverified',
        ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;
