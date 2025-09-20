import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('Running avatar storage migration...');
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20240914230000_create_avatars_bucket.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL migration...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('pg_temp.execute_sql', { sql });
    
    if (error) {
      // If the function doesn't exist, try direct SQL execution
      console.log('Function not found, trying direct SQL execution...');
      const { data: result, error: sqlError } = await supabase.rpc('execute_sql', { query: sql });
      
      if (sqlError) {
        console.error('Error executing SQL directly:', sqlError);
        console.log('\nPlease run this SQL in your Supabase SQL editor:');
        console.log(sql);
        return;
      }
      
      console.log('SQL executed successfully:', result);
      return;
    }
    
    console.log('Migration completed successfully:', data);
    
  } catch (error) {
    console.error('Error running migration:', error);
    console.log('\nPlease run this SQL in your Supabase SQL editor:');
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20240914230000_create_avatars_bucket.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(sql);
  }
}

runMigration();
