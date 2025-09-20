import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or API Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  try {
    console.log('Setting up avatar storage...');
    
    // 1. First, try to create the bucket directly
    console.log('Attempting to create avatars bucket...');
    const { data: bucket, error: createError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });
    
    if (createError) {
      if (createError.message.includes('already exists')) {
        console.log('Avatars bucket already exists');
      } else {
        console.error('Error creating bucket:', createError);
        throw createError;
      }
    } else {
      console.log('Successfully created avatars bucket');
    }
    
    // 2. Apply storage policies
    console.log('Applying storage policies...');
    
    const policies = [
      // Public read access to avatars
      `
      CREATE OR REPLACE POLICY "Allow public read access to avatars"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
      `,
      
      // Allow authenticated users to upload avatars
      `
      CREATE OR REPLACE POLICY "Allow authenticated users to upload avatars"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
      `,
      
      // Allow users to update their own avatars
      `
      CREATE OR REPLACE POLICY "Allow users to update their own avatars"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
      `,
      
      // Allow users to delete their own avatars
      `
      CREATE OR REPLACE POLICY "Allow users to delete their own avatars"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
      `
    ];
    
    // Execute each policy
    for (const policy of policies) {
      console.log('Executing policy:', policy.split('\n')[1].trim());
      const { error } = await supabase.rpc('execute_sql', { query: policy });
      
      if (error) {
        if (error.message.includes('already exists')) {
          console.log('Policy already exists, skipping...');
          continue;
        }
        console.error('Error applying policy:', error);
        throw error;
      }
    }
    
    console.log('Storage setup completed successfully!');
  } catch (error) {
    console.error('Error in setupStorage:', error);
    throw error;
  }
}

// Run the setup
setupStorage()
  .then(() => console.log('Setup completed successfully!'))
  .catch(error => console.error('Setup failed:', error));
