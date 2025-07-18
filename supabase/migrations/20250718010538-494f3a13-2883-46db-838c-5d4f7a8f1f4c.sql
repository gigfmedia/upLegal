
-- Create a table to store LinkedIn profile data
CREATE TABLE public.linkedin_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  linkedin_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  headline TEXT,
  summary TEXT,
  location TEXT,
  industry TEXT,
  profile_picture_url TEXT,
  public_profile_url TEXT,
  connections_count INTEGER,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.linkedin_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for LinkedIn profiles
CREATE POLICY "Users can view their own LinkedIn profile" 
  ON public.linkedin_profiles 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own LinkedIn profile" 
  ON public.linkedin_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn profile" 
  ON public.linkedin_profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LinkedIn profile" 
  ON public.linkedin_profiles 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create an index for faster lookups
CREATE INDEX idx_linkedin_profiles_user_id ON public.linkedin_profiles(user_id);
CREATE INDEX idx_linkedin_profiles_linkedin_id ON public.linkedin_profiles(linkedin_id);
