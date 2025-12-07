import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize the client with the service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function ensureAvatarsBucket() {
  try {
    // Check if the bucket exists
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket('avatars');
    
    if (bucketError) {
      if (bucketError.message.includes('Bucket not found')) {
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          fileSizeLimit: 1024 * 1024 * 5, // 5MB
        });
        
        if (createError) {
          throw createError;
        }
      } else {
        throw bucketError;
      }
    } else {

    }
    
    // Update bucket policy to be public
    const { error: policyError } = await supabase.rpc('storage_set_bucket_policy', {
      bucket_id: 'avatars',
      public: true,
      allowed_ops: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    });
    
    if (policyError && !policyError.message.includes('already exists')) {
      throw policyError;
    }
    
  } catch (error) {
    console.error('Error ensuring avatars bucket:', error);
    process.exit(1);
  }
}

ensureAvatarsBucket();
