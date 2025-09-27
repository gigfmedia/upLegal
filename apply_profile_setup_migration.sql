-- Add profile_setup_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_setup_completed BOOLEAN DEFAULT false;

-- Create or replace the function to update profile_setup_completed
CREATE OR REPLACE FUNCTION public.mark_profile_setup_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if required fields are filled
  IF NEW.first_name IS NOT NULL AND 
     NEW.last_name IS NOT NULL AND 
     NEW.bio IS NOT NULL AND 
     NEW.specialties IS NOT NULL AND 
     NEW.hourly_rate_clp IS NOT NULL THEN
    
    NEW.profile_setup_completed := true;
  ELSE
    NEW.profile_setup_completed := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_profile_setup_completed ON public.profiles;

-- Create the trigger
CREATE TRIGGER update_profile_setup_completed
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.mark_profile_setup_completed();

-- Update existing profiles based on current data
UPDATE public.profiles 
SET profile_setup_completed = (
  first_name IS NOT NULL AND 
  last_name IS NOT NULL AND 
  bio IS NOT NULL AND 
  specialties IS NOT NULL AND 
  hourly_rate_clp IS NOT NULL
);
