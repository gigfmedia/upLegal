-- Create ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lawyer_id, user_id) -- One rating per user per lawyer
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
ON public.ratings
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Enable insert for authenticated users"
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

-- Create function to update lawyer's average rating
CREATE OR REPLACE FUNCTION update_lawyer_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update lawyer's average rating and review count
    UPDATE public.profiles
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM public.ratings
            WHERE lawyer_id = NEW.lawyer_id
        ),
        review_count = (
            SELECT COUNT(*)
            FROM public.ratings
            WHERE lawyer_id = NEW.lawyer_id
        )
    WHERE id = NEW.lawyer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for insert/update/delete on ratings
CREATE TRIGGER update_lawyer_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION update_lawyer_rating();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ratings_lawyer_id ON public.ratings(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings(user_id);
