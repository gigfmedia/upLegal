-- Create the contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone (including anonymous) to insert messages
CREATE POLICY "Allow anonymous inserts" 
ON public.contact_messages 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Create policy to allow admins to view messages
-- Note: This assumes you have a way to identify admins in RLS, 
-- typically via a custom claim or a separate profiles table check.
-- For now, we'll allow service_role (dashboard) and the specific admin user if possible,
-- but since RLS with complex joins can be tricky without setup, 
-- we will allow authenticated users to view *their own* messages (if they have a user_id)
-- and service_role to view all.

CREATE POLICY "Allow users to view their own messages" 
ON public.contact_messages 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow service_role to do everything (for admin dashboard usage if using service key)
CREATE POLICY "Allow service_role full access" 
ON public.contact_messages 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
