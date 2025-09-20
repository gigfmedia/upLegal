import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStorage() {
  try {
    console.log('Verifying Supabase Storage configuration...');
    
    // 1. Check if we can access storage
    console.log('Checking storage access...');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error accessing storage:', error);
      return;
    }
    
    console.log('Available buckets:', buckets);
    
    // 2. Check if avatars bucket exists
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    
    if (!avatarsBucket) {
      console.error('❌ Avatars bucket does not exist');
      console.log('\nTo fix this, run the following SQL in your Supabase SQL editor:');
      console.log(`
        -- Create avatars bucket
        insert into storage.buckets (id, name, public)
        values ('avatars', 'avatars', true);
        
        -- Set up bucket policies
        create policy "Public Access"
        on storage.objects for select
        using (bucket_id = 'avatars');
        
        create policy "User can upload their own avatar"
        on storage.objects for insert
        with check (
          bucket_id = 'avatars' and 
          (storage.foldername(name))[1] = auth.uid()::text
        );
        
        create policy "User can update their own avatar"
        on storage.objects for update
        using (
          bucket_id = 'avatars' and 
          (storage.foldername(name))[1] = auth.uid()::text
        );
        
        create policy "User can delete their own avatar"
        on storage.objects for delete
        using (
          bucket_id = 'avatars' and 
          (storage.foldername(name))[1] = auth.uid()::text
        );
      `);
    } else {
      console.log('✅ Avatars bucket exists');
      
      // 3. Check bucket policies
      console.log('\nChecking bucket policies...');
      try {
        const { data: policies, error: policyError } = await supabase
          .rpc('get_bucket_policies', { bucket_id: 'avatars' });
          
        if (policyError) {
          console.error('Error getting bucket policies:', policyError);
          console.log('You may need to set up the bucket policies using the SQL above.');
        } else {
          console.log('Bucket policies:', policies);
        }
      } catch (e) {
        console.error('Error checking policies:', e);
      }
    }
    
  } catch (error) {
    console.error('Error verifying storage:', error);
  }
}

verifyStorage();
