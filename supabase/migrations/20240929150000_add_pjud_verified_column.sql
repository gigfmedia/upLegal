-- Add pjud_verified column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pjud_verified BOOLEAN DEFAULT FALSE;

-- Add a comment to describe the column
COMMENT ON COLUMN public.profiles.pjud_verified IS 'Indicates if the lawyer has been verified by PJUD';
