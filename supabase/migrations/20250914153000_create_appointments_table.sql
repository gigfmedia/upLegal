-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
    type TEXT NOT NULL CHECK (type IN ('video', 'phone', 'in-person')),
    lawyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60, -- in minutes
    location TEXT,
    meeting_link TEXT,
    price INTEGER NOT NULL, -- in CLP
    notes TEXT,
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_lawyer FOREIGN KEY (lawyer_id) REFERENCES auth.users(id),
    CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_appointments_lawyer_id ON public.appointments(lawyer_id);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);

-- Create RLS policies
-- Allow users to see their own appointments (both as lawyer and client)
CREATE POLICY "Enable read access for users' own appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
    auth.uid() = lawyer_id OR
    auth.uid() = client_id
);

-- Allow lawyers to create appointments
CREATE POLICY "Enable insert for authenticated users"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own appointments
CREATE POLICY "Enable update for appointment participants"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
    auth.uid() = lawyer_id OR
    auth.uid() = client_id
);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
