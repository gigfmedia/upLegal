-- Add study years columns to profiles table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'study_start_year'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN study_start_year INTEGER;
        
        RAISE NOTICE 'Added study_start_year column to profiles table';
    ELSE
        RAISE NOTICE 'study_start_year column already exists in profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'study_end_year'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN study_end_year INTEGER;
        
        RAISE NOTICE 'Added study_end_year column to profiles table';
    ELSE
        RAISE NOTICE 'study_end_year column already exists in profiles table';
    END IF;
    
    -- Update RLS policies
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
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding study years columns: %', SQLERRM;
END $$;
