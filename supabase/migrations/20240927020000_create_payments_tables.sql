-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  lawyer_id UUID REFERENCES auth.users(id) NOT NULL,
  service_id UUID REFERENCES public.services(id),
  amount INTEGER NOT NULL, -- in cents
  platform_fee INTEGER NOT NULL, -- in cents
  lawyer_amount INTEGER NOT NULL, -- in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  transfer_status VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_amounts CHECK (amount = platform_fee + lawyer_amount)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_lawyer_id ON public.payments(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Lawyers can view payments for their services"
  ON public.payments FOR SELECT
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Admins can manage all payments"
  ON public.payments
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to increment lawyer's balance
CREATE OR REPLACE FUNCTION public.increment_lawyer_balance(
  lawyer_id UUID,
  amount INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + amount
  WHERE id = lawyer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
