import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfileSchema() {
  try {
    // Get sample data with study years
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) throw profilesError;

    // Try to update a profile with study years
    if (profiles.length > 0) {
      const profileToUpdate = profiles[0];
      const updateData = {
        study_start_year: 2010,
        study_end_year: 2015,
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileToUpdate.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
      } else {
        
      }
    }
  } catch (error) {
    console.error('Error checking profile data:', error);
  }
}

checkProfileSchema();
