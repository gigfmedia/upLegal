import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  try {
    console.log('Applying avatar fix migrations...');
    
    // Create the update_profile_avatar function
    const { error: functionError } = await supabase.rpc('create_or_replace_function', {
      function_name: 'update_profile_avatar',
      function_definition: `
      CREATE OR REPLACE FUNCTION public.update_profile_avatar(user_id uuid, avatar_url text)
      RETURNS void
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        UPDATE public.profiles 
        SET avatar_url = update_profile_avatar.avatar_url,
            updated_at = now()
        WHERE id = update_profile_avatar.user_id;
      $$;
      `
    });

    if (functionError) {
      console.error('Error creating function:', functionError);
      throw functionError;
    }

    console.log('Granting execute permission...');
    const { error: grantError } = await supabase.rpc('grant', {
      privilege: 'EXECUTE',
      object_type: 'FUNCTION',
      object_name: 'update_profile_avatar(uuid, text)',
      grantee: 'authenticated'
    });

    if (grantError) {
      console.error('Error granting permissions:', grantError);
      throw grantError;
    }

    console.log('Updating storage policies...');
    const { error: policyError } = await supabase.rpc('create_or_replace_policy', {
      policy_name: 'Enable avatar update for users based on user_id',
      table_name: 'profiles',
      policy_definition: `
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
      `
    });

    if (policyError) {
      console.error('Error updating policies:', policyError);
      throw policyError;
    }

    console.log('All migrations applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  }
}

applyMigrations();
