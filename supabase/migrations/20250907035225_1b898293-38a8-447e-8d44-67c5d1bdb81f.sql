-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role text DEFAULT 'client' CHECK (role IN ('client', 'lawyer'));

-- Update the handle_new_user function to properly set the role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    display_name,
    role,
    specialties,
    hourly_rate_clp,
    verified,
    rating,
    review_count
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    '',
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', 'client') = 'lawyer' THEN '{}'::text[]
      ELSE NULL
    END,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', 'client') = 'lawyer' THEN 0
      ELSE NULL
    END,
    false,
    0,
    0
  );
  RETURN NEW;
END;
$$;