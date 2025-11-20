-- Create lawyer_availability table
CREATE TABLE IF NOT EXISTS public.lawyer_availability (
  lawyer_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  availability JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.lawyer_availability ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Lawyers can manage their own availability"
  ON public.lawyer_availability
  FOR ALL
  USING (auth.uid() = lawyer_id)
  WITH CHECK (auth.uid() = lawyer_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER update_lawyer_availability_updated_at
BEFORE UPDATE ON public.lawyer_availability
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
