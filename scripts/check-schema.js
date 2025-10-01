import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    // Check if the columns exist in the profiles table
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .in('column_name', ['study_start_year', 'study_end_year']);

    if (error) throw error;

    console.log('Study year columns in profiles table:');
    console.log(columns || 'No columns found');

    // Check the RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'profiles');

    if (policiesError) throw policiesError;

    console.log('\nRLS policies for profiles table:');
    console.log(policies || 'No policies found');

  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();
