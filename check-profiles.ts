import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  try {
    console.log('Fetching all lawyer profiles...');
    
    // Get all lawyer profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'lawyer')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    console.log(`Found ${profiles.length} lawyer profiles`);
    
    // Log each profile
    profiles.forEach((profile, index) => {
      console.log(`\n--- Profile ${index + 1} ---`);
      console.log(`ID: ${profile.id}`);
      console.log(`Name: ${profile.first_name} ${profile.last_name}`);
      console.log(`Email: ${profile.email || 'N/A'}`);
      console.log(`Verified: ${profile.verified}`);
      console.log(`Active: ${profile.is_active !== false}`);
      console.log(`Specialties: ${JSON.stringify(profile.specialties)}`);
      console.log(`Created: ${profile.created_at}`);
    });
    
    // Check if Gabriela Gómez exists
    const gabriela = profiles.find(p => 
      p.first_name === 'Gabriela' && 
      p.last_name === 'Gómez'
    );
    
    if (gabriela) {
      console.log('\nGabriela Gómez found in database:');
      console.log(JSON.stringify(gabriela, null, 2));
    } else {
      console.log('\nGabriela Gómez not found in the database');
    }
    
  } catch (error) {
    console.error('Error checking profiles:', error);
  }
}

checkProfiles();
