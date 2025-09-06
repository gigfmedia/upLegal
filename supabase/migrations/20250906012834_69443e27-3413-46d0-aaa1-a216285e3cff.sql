-- Create a table for lawyer services
CREATE TABLE public.lawyer_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_clp INTEGER NOT NULL,
  delivery_time TEXT,
  features TEXT[] DEFAULT '{}',
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lawyer_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Services are viewable by everyone" 
ON public.lawyer_services 
FOR SELECT 
USING (true);

CREATE POLICY "Lawyers can manage their own services" 
ON public.lawyer_services 
FOR ALL
USING (auth.uid() = lawyer_user_id);

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  website TEXT,
  specialties TEXT[] DEFAULT '{}',
  hourly_rate_clp INTEGER,
  response_time TEXT DEFAULT '1 hora',
  satisfaction_rate INTEGER DEFAULT 98,
  languages TEXT[] DEFAULT ARRAY['Español'],
  availability TEXT DEFAULT '24/7',
  verified BOOLEAN DEFAULT false,
  available_for_hire BOOLEAN DEFAULT true,
  bar_number TEXT,
  zoom_link TEXT,
  education JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  experience_years INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on services
CREATE TRIGGER update_lawyer_services_updated_at
BEFORE UPDATE ON public.lawyer_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();