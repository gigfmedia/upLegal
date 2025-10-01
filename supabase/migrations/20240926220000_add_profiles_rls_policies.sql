-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Allow all users to view all profiles
CREATE POLICY "Enable read access for all users"
ON public.profiles
FOR SELECT
USING (true);
