-- 1. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- 2. Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Allow all users to view all profiles
CREATE POLICY "Enable read access for all users"
ON public.profiles
FOR SELECT
USING (true);
