-- Create a function to update just the RUT field
CREATE OR REPLACE FUNCTION public.update_profile_rut(
  p_user_id UUID,
  p_rut TEXT
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the RUT field directly
  UPDATE public.profiles
  SET rut = p_rut,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'RUT actualizado correctamente'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_profile_rut(UUID, TEXT) TO authenticated;
