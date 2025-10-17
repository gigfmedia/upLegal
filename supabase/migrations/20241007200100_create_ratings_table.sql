-- Create ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lawyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lawyer_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ratings_lawyer_id ON public.ratings(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings(user_id);

-- Create RLS policies
CREATE POLICY "Enable read access for all users" 
ON public.ratings
FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Enable insert for authenticated users only"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
ON public.ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
ON public.ratings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create a function to get rating statistics
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

-- Create a trigger to update the lawyer's rating when a new rating is added/updated/deleted
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

-- Create the trigger
DROP TRIGGER IF EXISTS update_lawyer_rating_trigger ON public.ratings;

CREATE TRIGGER update_lawyer_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.update_lawyer_rating();

-- Add a comment to the ratings table
COMMENT ON TABLE public.ratings IS 'Stores user ratings and reviews for lawyers';
