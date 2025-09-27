-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow public read access') THEN
        DROP POLICY "Allow public read access" ON public.profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow users to update their own profile') THEN
        DROP POLICY "Allow users to update their own profile" ON public.profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow users to insert their own profile') THEN
        DROP POLICY "Allow users to insert their own profile" ON public.profiles;
    END IF;
END $$;

-- Create new policies
-- Allow public read access to all profiles
CREATE POLICY "Allow public read access"
ON public.profiles
FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Allow users to insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Verify the policies were created
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public';
