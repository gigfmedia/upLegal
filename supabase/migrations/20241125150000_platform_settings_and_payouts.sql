-- Create platform_settings table to manage global fee configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_surcharge_percent NUMERIC NOT NULL DEFAULT 0.10,
  platform_fee_percent NUMERIC NOT NULL DEFAULT 0.20,
  currency TEXT NOT NULL DEFAULT 'CLP',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_percent_range CHECK (
    client_surcharge_percent >= 0 AND client_surcharge_percent <= 1
    AND platform_fee_percent >= 0 AND platform_fee_percent <= 1
  )
);

-- Only keep a single row (enforced via unique partial index)
CREATE UNIQUE INDEX IF NOT EXISTS platform_settings_singleton_idx
  ON public.platform_settings ((TRUE));

-- Ensure default row exists
INSERT INTO public.platform_settings (client_surcharge_percent, platform_fee_percent, currency)
SELECT 0.10, 0.20, 'CLP'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_settings_set_updated_at ON public.platform_settings;
CREATE TRIGGER platform_settings_set_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- Enable RLS and restrict access to admins/service role
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_settings_select_admin
  ON public.platform_settings FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY platform_settings_select_public
  ON public.platform_settings FOR SELECT
  USING (TRUE);

CREATE POLICY platform_settings_update_admin
  ON public.platform_settings FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  ) WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY platform_settings_insert_admin
  ON public.platform_settings FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Extend payments table with richer accounting + payout metadata
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS original_amount INTEGER,
  ADD COLUMN IF NOT EXISTS client_surcharge INTEGER,
  ADD COLUMN IF NOT EXISTS client_surcharge_percent NUMERIC DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS payout_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_error TEXT;

-- Initialize historical rows with sane defaults
UPDATE public.payments
SET
  original_amount = COALESCE(original_amount, total_amount),
  client_surcharge = COALESCE(client_surcharge, GREATEST(total_amount - COALESCE(original_amount, total_amount), 0)),
  client_surcharge_percent = COALESCE(client_surcharge_percent, 0.10),
  platform_fee_percent = COALESCE(platform_fee_percent, 0.20),
  payout_status = COALESCE(payout_status, 'pending')
WHERE TRUE;

-- Table to log payout executions
CREATE TABLE IF NOT EXISTS public.payout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lawyer_user_id UUID NOT NULL REFERENCES auth.users(id),
  total_amount INTEGER NOT NULL,
  payment_ids TEXT[] NOT NULL,
  status TEXT NOT NULL,
  reference TEXT,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_logs_lawyer_idx ON public.payout_logs(lawyer_user_id);
CREATE INDEX IF NOT EXISTS payout_logs_status_idx ON public.payout_logs(status);

ALTER TABLE public.payout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY payout_logs_select_admin
  ON public.payout_logs FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY payout_logs_insert_admin
  ON public.payout_logs FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
