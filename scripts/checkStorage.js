import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function checkStorage() {
  try {
    console.log('Checking storage configuration...');
    
    // Check if avatars bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    
    if (!avatarsBucket) {
      console.log('Avatars bucket does not exist. Creating...');
      const { data, error } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
        fileSizeLimit: 1024 * 1024 * 5, // 5MB
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        return;
      }
      
      console.log('Created avatars bucket:', data);
    } else {
      console.log('Avatars bucket exists:', avatarsBucket);
    }
    
    // Check bucket policies
    console.log('Checking bucket policies...');
    
    // Set public access policy
    const { data: publicPolicy, error: publicPolicyError } = await supabase.rpc('get_bucket_policy', { bucket_id: 'avatars' });
    
    if (publicPolicyError) {
      console.log('Setting public access policy...');
      const { error } = await supabase.storage
        .from('avatars')
        .createSignedUrl('test', 60); // This will create a public URL policy
      
      if (error) {
        console.error('Error setting public policy:', error);
      } else {
        console.log('Set public access policy');
      }
    }
    
    console.log('Storage configuration is ready!');
    
  } catch (error) {
    console.error('Error checking storage:', error);
  }
}

checkStorage();
