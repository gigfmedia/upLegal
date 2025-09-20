import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or API Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  try {
    console.log('Checking RLS policies...');
    
    // Check if we can query the storage.objects table
    console.log('Attempting to query storage.objects...');
    const { data: objects, error: objectsError } = await supabase
      .from('storage.objects')
      .select('*')
      .limit(1);
    
    if (objectsError) {
      console.error('Error querying storage.objects:', objectsError);
    } else {
      console.log('Successfully queried storage.objects. First object:', objects[0]);
    }
    
    // Check if we can create a bucket
    console.log('Attempting to list buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
    } else {
      console.log('Existing buckets:', buckets);
    }
    
  } catch (error) {
    console.error('Error checking policies:', error);
  }
}

checkPolicies();
