-- Check the structure of the profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles';

-- Check the RLS policies for the profiles table
SELECT * FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if the study years columns exist and their data types
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('study_start_year', 'study_end_year');
