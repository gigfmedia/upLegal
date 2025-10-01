-- Add education-related fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS study_start_year INTEGER,
  ADD COLUMN IF NOT EXISTS study_end_year INTEGER,
  ADD COLUMN IF NOT EXISTS education TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS university TEXT DEFAULT '';
