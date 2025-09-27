#!/bin/bash

# This script will fix the storage schema and permissions in the Supabase database

# Get the database container ID
CONTAINER_ID=$(docker ps -q -f name=supabase_db)

if [ -z "$CONTAINER_ID" ]; then
  echo "Error: Supabase database container not found. Make sure Supabase is running with 'supabase start'"
  exit 1
fi

echo "Found Supabase database container: $CONTAINER_ID"

echo "Fixing storage schema and permissions..."

docker exec -i $CONTAINER_ID psql -U postgres -d postgres <<-EOSQL
  -- Connect as postgres superuser
  \c postgres postgres
  
  -- Create storage schema if it doesn't exist
  CREATE SCHEMA IF NOT EXISTS storage;
  
  -- Set owner of storage schema to postgres
  ALTER SCHEMA storage OWNER TO postgres;
  
  -- Create buckets table with correct schema
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
    CONSTRAINT name_format CHECK (name ~ '^[a-z0-9_-]+\$')
  );
  
  -- Set owner of buckets table to postgres
  ALTER TABLE storage.buckets OWNER TO postgres;
  
  -- Grant necessary permissions
  GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO postgres, service_role;
  
  -- Create avatars bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
  
  -- Create public bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('public', 'public', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
  
  -- Verify the changes
  \dt storage.*
EOSQL

echo "Done! Storage schema and permissions have been fixed."
