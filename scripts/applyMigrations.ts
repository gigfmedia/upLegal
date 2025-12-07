import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or API Key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname, 
      '../supabase/migrations/20250914220000_setup_avatar_policies.sql'
    );
    
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    const { data, error } = await supabase.rpc('exec', { query: sql });
    
    if (error) {
      console.error('Error applying migration:', error);
      return;
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyMigrations();
