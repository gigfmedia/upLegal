// Simple script to check profile data in the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfile() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!user) {
      console.log('No user is currently signed in');
      return;
    }

    console.log('User ID:', user.id);
    console.log('User email:', user.email);
    
    // Get profile data from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) throw profileError;

    console.log('\nProfile data from database:');
    console.log('Study Start Year:', profile.study_start_year, typeof profile.study_start_year);
    console.log('Study End Year:', profile.study_end_year, typeof profile.study_end_year);
    
    // Get user metadata
    console.log('\nUser metadata:');
    console.log('Study Start Year (metadata):', user.user_metadata?.study_start_year, typeof user.user_metadata?.study_start_year);
    console.log('Study End Year (metadata):', user.user_metadata?.study_end_year, typeof user.user_metadata?.study_end_year);

  } catch (error) {
    console.error('Error checking profile:', error);
  }
}

checkProfile();
