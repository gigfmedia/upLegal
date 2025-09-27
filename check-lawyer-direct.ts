import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLawyerProfile() {
  try {
    console.log('Fetching all profiles...');
    
    // Get all profiles to check the structure
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(10); // Limit to 10 for testing

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    console.log('First 10 profiles:', JSON.stringify(profiles, null, 2));
    
    // Now try to find the specific lawyer
    const { data: lawyerData, error: lawyerError } = await supabase
      .from('profiles')
      .select('*')
      .or('first_name.ilike.%gabriela%,last_name.ilike.%gomez%')
      .eq('role', 'lawyer');

    if (lawyerError) {
      console.error('Error searching for lawyer:', lawyerError);
      return;
    }

    console.log('\nMatching lawyers:', JSON.stringify(lawyerData, null, 2));
    
  } catch (error) {
    console.error('Error checking profiles:', error);
  }
}

checkLawyerProfile();
