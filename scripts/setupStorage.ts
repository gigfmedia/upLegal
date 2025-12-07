import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) throw listError;
    
    const bucketExists = buckets.some(bucket => bucket.name === 'avatars');
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
      });
      
      if (createError) throw createError;
    } else {
      
    }
    
    // Set bucket policies
    const { error: policyError } = await supabase.rpc('set_avatar_policies');
    
    if (policyError) throw policyError;
  } catch (error) {
    console.error('Error setting up storage:', error);
    process.exit(1);
  }
}

setupStorage();
