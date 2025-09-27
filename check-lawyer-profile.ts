import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5OTIxMCwiZXhwIjoyMDY4Mzc1MjEwfQ.8Q9QJQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkLawyerProfile() {
  try {
    console.log('Checking lawyer profile for gabignaciagomez@gmail.com...');
    
    // Search for users with the email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      filter: {
        email: 'gabignaciagomez@gmail.com'
      }
    });

    if (userError) throw userError;
    
    const user = users?.users?.[0];
    if (!user) {
      console.log('No user found with email gabignaciagomez@gmail.com');
      return;
    }

    console.log('Found user ID:', user.id);
    console.log('User email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
    console.log('User last sign in:', user.last_sign_in_at);

    // Check if user is active
    if (user.confirmed_at === null) {
      console.log('User email is not confirmed');
    }

    // Check user metadata
    console.log('User metadata:', user.user_metadata);
    
  } catch (error) {
    console.error('Error checking lawyer profile:', error);
  }
}

checkLawyerProfile();
