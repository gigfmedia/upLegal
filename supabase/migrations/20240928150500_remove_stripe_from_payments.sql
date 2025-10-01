-- Remove Stripe-related columns from payments table
ALTER TABLE public.payments 
DROP COLUMN IF EXISTS stripe_payment_intent_id,
DROP COLUMN IF EXISTS stripe_transfer_id,
DROP COLUMN IF EXISTS transfer_status;

-- Drop the index for Stripe payment intent ID
DROP INDEX IF EXISTS idx_payments_stripe_payment_intent_id;
