-- Create function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
RETURNS boolean AS $$
DECLARE
    column_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) INTO column_exists;
    
    RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all columns of profiles table
CREATE OR REPLACE FUNCTION get_profile_columns()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(column_name) 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add university column if it doesn't exist
DO $$
BEGIN
    IF NOT column_exists('profiles', 'university') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN university TEXT DEFAULT '';
        
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
        
        RAISE NOTICE 'Added university column to profiles table';
    ELSE
        RAISE NOTICE 'University column already exists in profiles table';
    END IF;
END $$;
