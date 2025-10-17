-- Drop existing foreign key constraints if they exist
ALTER TABLE public.ratings 
  DROP CONSTRAINT IF EXISTS ratings_lawyer_id_fkey,
  DROP CONSTRAINT IF EXISTS ratings_user_id_fkey;

-- Recreate the foreign key constraints with proper references
ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_lawyer_id_fkey 
    FOREIGN KEY (lawyer_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT ratings_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- Create or replace the RPC function for getting rating stats
CREATE OR REPLACE FUNCTION public.get_rating_stats(lawyer_id UUID)
RETURNS TABLE (average_rating NUMERIC, rating_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating,
    COUNT(*) as rating_count
  FROM public.ratings
  WHERE ratings.lawyer_id = $1;
$$;

-- Update the trigger function to use the new RPC function
CREATE OR REPLACE FUNCTION public.update_lawyer_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update lawyer's average rating and review count using the RPC function
  UPDATE public.profiles p
  SET 
    rating = COALESCE((SELECT average_rating FROM get_rating_stats(COALESCE(NEW.lawyer_id, OLD.lawyer_id))), 0),
    reviews = COALESCE((SELECT rating_count FROM get_rating_stats(COALESCE(NEW.lawyer_id, OLD.lawyer_id))), 0)
  WHERE id = COALESCE(NEW.lawyer_id, OLD.lawyer_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS update_lawyer_rating_trigger ON public.ratings;

CREATE TRIGGER update_lawyer_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.update_lawyer_rating();
