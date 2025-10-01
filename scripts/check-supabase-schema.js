// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing required environment variables.');
  console.log('Please make sure you have the following in your .env.local file:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');
    
    // Get the current user's profile with all fields
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user is currently signed in. Please sign in first.');
      return;
    }
    
    console.log(`Checking profile for user: ${user.email}\n`);
    
    // Get the profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }
    
    console.log('Current profile data:');
    console.log(JSON.stringify(profile, null, 2));
    
    // Check the columns in the profiles table
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .in('column_name', ['study_start_year', 'study_end_year']);
    
    if (columnsError) {
      console.error('Error checking columns:', columnsError);
      return;
    }
    
    console.log('\nStudy year columns in profiles table:');
    console.log(columns.length > 0 ? columns : 'Study year columns not found');
    
    // Check the RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'profiles');
    
    if (policiesError) {
      console.error('Error checking RLS policies:', policiesError);
      return;
    }
    
    console.log('\nRLS policies for profiles table:');
    console.log(policies.length > 0 ? policies : 'No RLS policies found');
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();
