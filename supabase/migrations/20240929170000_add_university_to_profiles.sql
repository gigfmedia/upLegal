-- Add university column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS university TEXT DEFAULT '';

-- Update RLS policies to include the new column
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
CREATE POLICY "Enable read access for all users" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
CREATE POLICY "Enable update for users based on user_id" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment to the column
COMMENT ON COLUMN public.profiles.university IS 'The university where the lawyer studied';
