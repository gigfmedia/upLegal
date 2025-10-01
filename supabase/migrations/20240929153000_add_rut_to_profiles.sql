-- Add RUT column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'rut') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN rut TEXT,
        ADD COLUMN pjud_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN verification_message TEXT;
        
        COMMENT ON COLUMN public.profiles.rut IS 'Chilean RUT (Rol Único Tributario) for lawyer verification';
        COMMENT ON COLUMN public.profiles.pjud_verified IS 'Indicates if the lawyer has been verified by PJUD';
        COMMENT ON COLUMN public.profiles.verification_message IS 'Message related to the verification status';
    END IF;
END
$$;
