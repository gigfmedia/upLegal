import { createClient } from '@supabase/supabase-js';

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

async function setupAvatarsBucket() {
  try {
    // Create the bucket if it doesn't exist
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      fileSizeLimit: 1024 * 1024 * 5, // 5MB
    });

    if (bucketError && bucketError.message !== 'Bucket already exists') {
      throw bucketError;
    }
    
    // Set bucket policies
    await supabase.rpc('storage_set_bucket_policies', {
      bucket_id: 'avatars',
      public: true,
      allowed_ops: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    });
    
  } catch (error) {
    console.error('Error setting up avatars bucket:', error);
    process.exit(1);
  }
}

setupAvatarsBucket();
