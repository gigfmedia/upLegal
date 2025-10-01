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

    console.log('=== Sample Profile Data ===');
    profiles.forEach(profile => {
      console.log('\n--- Profile ---');
      console.log(`Name: ${profile.first_name} ${profile.last_name}`);
      console.log(`Study Start Year: ${profile.study_start_year} (${typeof profile.study_start_year})`);
      console.log(`Study End Year: ${profile.study_end_year} (${typeof profile.study_end_year})`);
      console.log('All fields:', Object.keys(profile).join(', '));
    });

    // Try to update a profile with study years
    if (profiles.length > 0) {
      const profileToUpdate = profiles[0];
      const updateData = {
        study_start_year: 2010,
        study_end_year: 2015,
        updated_at: new Date().toISOString()
      };

      console.log('\nAttempting to update profile with:', updateData);
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileToUpdate.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
      } else {
        console.log('Successfully updated profile:', {
          study_start_year: updatedProfile.study_start_year,
          study_end_year: updatedProfile.study_end_year
        });
      }
    }
  } catch (error) {
    console.error('Error checking profile data:', error);
  }
}

checkProfileSchema();
