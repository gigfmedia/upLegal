import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
const env = dotenv.config({ path: envPath });

if (env.error) {
  console.error('Error loading .env file:', env.error);
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment variables loaded:');
console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '***' : 'Not found');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '***' : 'Not found');
console.log('- VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '***' : 'Not found');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' : 'Not found');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Anon Key');
  console.log('Current working directory:', process.cwd());
  console.log('Environment file path:', envPath);
  process.exit(1);
}

console.log('Connecting to Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  console.log('Checking profiles table...');
  
  // Get the first 5 profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(5);
    
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('No profiles found in the database');
    return;
  }
  
  console.log('\nFirst profile structure:');
  console.log('----------------------');
  
  // Log all fields from the first profile
  const firstProfile = profiles[0];
  for (const [key, value] of Object.entries(firstProfile)) {
    console.log(`${key}: ${JSON.stringify(value)} (${typeof value})`);
  }
  
  console.log('\nAll fields in profiles table:');
  console.log('--------------------------');
  
  // Get all unique fields across profiles
  const allFields = new Set();
  profiles.forEach(profile => {
    Object.keys(profile).forEach(field => allFields.add(field));
  });
  
  console.log(Array.from(allFields).sort().join('\n'));
  
  // Check for bio in different fields
  console.log('\nChecking for bio in different fields:');
  console.log('--------------------------------');
  
  const bioFields = ['bio', 'description', 'about', 'biography', 'biografia', 'descripcion'];
  
  profiles.forEach((profile, index) => {
    console.log(`\nProfile ${index + 1}:`);
    let hasBio = false;
    
    for (const field of bioFields) {
      if (profile[field] && typeof profile[field] === 'string' && profile[field].trim() !== '') {
        console.log(`  Found bio in '${field}': ${profile[field].substring(0, 50)}...`);
        hasBio = true;
      }
    }
    
    if (!hasBio) {
      console.log('  No bio found in any known field');
    }
  });
}

checkProfiles().catch(console.error);
