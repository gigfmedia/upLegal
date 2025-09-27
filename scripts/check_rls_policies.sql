-- Check if RLS is enabled on profiles table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check existing RLS policies on profiles table
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- Check if auth.uid() function exists
SELECT proname, pronargs, prorettype::regtype 
FROM pg_proc 
WHERE proname = 'uid' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');

-- Check if auth.jwt() function exists
SELECT proname, pronargs, prorettype::regtype 
FROM pg_proc 
WHERE proname = 'jwt' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');
