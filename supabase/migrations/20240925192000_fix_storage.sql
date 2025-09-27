-- First, create the storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create the buckets table with the correct schema
CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  owner UUID REFERENCES auth.users(id) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  public BOOLEAN DEFAULT false,
  file_size_limit BIGINT DEFAULT NULL,
  allowed_mime_types TEXT[] DEFAULT NULL,
  avif_autodetection BOOLEAN DEFAULT false,
  CONSTRAINT name_format CHECK (name ~ '^[a-z0-9_-]+$')
);

-- Create the avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create the public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO UPDATE SET public = true;
