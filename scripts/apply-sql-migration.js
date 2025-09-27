import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env file
const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('Reading SQL migration file...');
    const sql = fs.readFileSync('supabase/migrations/20240921212000_fix_profile_rls_policies.sql', 'utf8');
    
    console.log('Applying SQL migration...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error applying migration:', data);
      process.exit(1);
    }
    
    console.log('Successfully applied RLS policies!', data);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applyMigration();
