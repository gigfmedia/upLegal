import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables from .env file
const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRlsFix() {
  try {
    console.log('Applying RLS fix for profile updates...');
    
    // Drop existing policies if they exist
    const dropPolicies = await supabase.rpc('execute_sql', {
      query: `
        DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
      `
    });
    
    if (dropPolicies.error) {
      console.error('Error dropping policies:', dropPolicies.error);
      throw dropPolicies.error;
    }
    
    console.log('Dropped existing policies');
    
    // Create update policy
    const updatePolicy = await supabase.rpc('execute_sql', {
      query: `
        CREATE POLICY "Users can update their own profile" 
        ON public.profiles 
        FOR UPDATE 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
      `
    });
    
    if (updatePolicy.error) {
      console.error('Error creating update policy:', updatePolicy.error);
      throw updatePolicy.error;
    }
    
    console.log('Created update policy');
    
    // Create insert policy
    const insertPolicy = await supabase.rpc('execute_sql', {
      query: `
        CREATE POLICY "Users can insert their own profile" 
        ON public.profiles 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      `
    });
    
    if (insertPolicy.error) {
      console.error('Error creating insert policy:', insertPolicy.error);
      throw insertPolicy.error;
    }
    
    console.log('Created insert policy');
    
    console.log('Successfully applied RLS fix!');
  } catch (error) {
    console.error('Error applying RLS fix:', error);
    process.exit(1);
  }
}

applyRlsFix();
