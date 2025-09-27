-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
    -- Drop all existing policies on the profiles table
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.profiles;', ' ')
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
    );
END $$;

-- Create new policies
-- 1. Allow public read access to all profiles
CREATE POLICY "Allow public read access"
ON public.profiles
FOR SELECT
USING (true);

-- 2. Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to insert their own profile
CREATE POLICY "Allow users to insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to delete their own profile
CREATE POLICY "Allow users to delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- 5. Allow authenticated users to select any profile (redundant with the first policy but more explicit)
CREATE POLICY "Allow authenticated users to select any profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Verify the policies were created
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public';
