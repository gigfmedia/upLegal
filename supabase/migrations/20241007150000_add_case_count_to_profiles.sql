-- Add case count column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS case_count INTEGER NOT NULL DEFAULT 0;

-- Update RLS policy to allow read access to case_count
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
CREATE POLICY "Enable read access for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Update RLS policy to allow users to update their own case_count
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
CREATE POLICY "Enable update for users based on id"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
