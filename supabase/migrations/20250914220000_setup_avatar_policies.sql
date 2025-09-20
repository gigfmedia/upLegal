-- Create or replace function to set avatar policies
CREATE OR REPLACE FUNCTION public.set_avatar_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow public read access to avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Allow public read access to avatars'
  ) THEN
    CREATE POLICY "Allow public read access to avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;

  -- Allow authenticated users to upload avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to upload avatars'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Allow users to update their own avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Allow users to update their own avatars'
  ) THEN
    CREATE POLICY "Allow users to update their own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Allow users to delete their own avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Allow users to delete their own avatars'
  ) THEN
    CREATE POLICY "Allow users to delete their own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END;
$$;

-- Execute the function to set up the policies
SELECT public.set_avatar_policies();
