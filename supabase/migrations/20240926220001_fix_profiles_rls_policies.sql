-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

-- Create new policy with correct column name
CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Also fix any other policies that might reference user_id
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
CREATE POLICY "Enable read access for all users"
ON public.profiles
FOR SELECT
USING (true);
