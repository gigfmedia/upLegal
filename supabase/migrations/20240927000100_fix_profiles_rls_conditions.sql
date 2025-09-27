-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "allow insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "allow update own profile" ON public.profiles;

-- Recreate policies with correct column names
-- 1. Allow public read access to all profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- 2. Allow users to update their own profile (using user_id instead of id)
CREATE POLICY "allow update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to insert their own profile (using user_id instead of id)
CREATE POLICY "allow insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to delete their own profile
CREATE POLICY "allow delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify the policies were updated
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public';
