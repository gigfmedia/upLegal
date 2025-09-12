-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    display_name,
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
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' = 'lawyer' THEN '{}'::text[]
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' = 'lawyer' THEN 0
      ELSE NULL
    END,
    false,
    0,
    0
  );
  RETURN NEW;
END;
$$;

-- Create trigger that fires after user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();