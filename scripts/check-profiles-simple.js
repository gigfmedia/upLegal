import { createClient } from '@supabase/supabase-js';

// These values should match your .env file
const supabaseUrl = 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU';

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
