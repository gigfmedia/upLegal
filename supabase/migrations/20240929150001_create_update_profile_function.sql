-- Create a function to update profile verification
CREATE OR REPLACE FUNCTION public.update_profile_verification(
  user_id UUID,
  p_rut TEXT,
  p_message TEXT
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  column_exists BOOLEAN;
  query TEXT;
BEGIN
  -- Check if pjud_verified column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'pjud_verified'
  ) INTO column_exists;
  
  -- Build dynamic query based on column existence
  IF column_exists THEN
    query := format('UPDATE public.profiles 
                    SET rut = %L, 
                        verification_message = %L, 
                        pjud_verified = true,
                        updated_at = NOW() 
                    WHERE id = %L 
                    RETURNING to_jsonb(public.profiles.*)', 
                    p_rut, p_message, user_id);
  ELSE
    query := format('UPDATE public.profiles 
                    SET rut = %L, 
                        verification_message = %L, 
                        updated_at = NOW() 
                    WHERE id = %L 
                    RETURNING to_jsonb(public.profiles.*)', 
                    p_rut, p_message, user_id);
  END IF;
  
  -- Execute the dynamic query
  EXECUTE query INTO result;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', result
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
