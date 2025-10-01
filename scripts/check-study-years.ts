// Import the supabase client from the project
import { supabase } from '../src/lib/supabaseClient';

// This script needs to be run in the browser console to access the current session
// Run this in your browser's developer console when logged in:
/*
async function checkStudyYears() {
  try {
    // Get current user's profile
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user is currently logged in');
      return;
    }

    console.log('Checking study years for user:', user.email);
    
    // Get the profile data
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    
    console.log('Profile data from database:', {
      study_start_year: profile.study_start_year,
      study_end_year: profile.study_end_year,
      study_start_year_type: typeof profile.study_start_year,
      study_end_year_type: typeof profile.study_end_year,
      updated_at: profile.updated_at
    });
    
    // Try to update the profile with test data
    const updateData = {
      study_start_year: 2010,
      study_end_year: 2015,
      updated_at: new Date().toISOString()
    };
    
    console.log('\nAttempting to update with:', updateData);
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating profile:', updateError);
    } else {
      console.log('Successfully updated profile:', {
        study_start_year: updatedProfile.study_start_year,
        study_end_year: updatedProfile.study_end_year,
        updated_at: updatedProfile.updated_at
      });
    }
    
  } catch (error) {
    console.error('Error checking study years:', error);
  }
}

checkStudyYears();
*/

// For direct execution, we'll just log instructions
console.log('Please run this script in your browser\'s developer console while logged in to your application.');
console.log('Copy the function from the script file and run it in the console.');

async function checkStudyYears() {
  try {
    // Get current user's profile
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user is currently logged in');
      return;
    }

    console.log('Checking study years for user:', user.email);
    
    // Get the profile data
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    
    console.log('Profile data from database:', {
      study_start_year: profile.study_start_year,
      study_end_year: profile.study_end_year,
      study_start_year_type: typeof profile.study_start_year,
      study_end_year_type: typeof profile.study_end_year,
      updated_at: profile.updated_at
    });
    
    // Try to update the profile with test data
    const updateData = {
      study_start_year: 2010,
      study_end_year: 2015,
      updated_at: new Date().toISOString()
    };
    
    console.log('\nAttempting to update with:', updateData);
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating profile:', updateError);
    } else {
      console.log('Successfully updated profile:', {
        study_start_year: updatedProfile.study_start_year,
        study_end_year: updatedProfile.study_end_year,
        updated_at: updatedProfile.updated_at
      });
    }
    
  } catch (error) {
    console.error('Error checking study years:', error);
  }
}

checkStudyYears();
