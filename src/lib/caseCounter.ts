import { supabase } from './supabaseClient';

export const incrementCaseCount = async (lawyerId: string): Promise<{ success: boolean; error?: Error }> => {
  try {
    // First, get the current case count
    const { data: currentData, error: fetchError } = await supabase
      .from('profiles')
      .select('cases')
      .eq('id', lawyerId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error('Error fetching current case count:', fetchError);
      return { success: false, error: fetchError };
    }

    const currentCount = currentData?.cases || 0;
    const newCount = currentCount + 1;

    // Update the case count
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ cases: newCount })
      .eq('id', lawyerId);

    if (updateError) {
      console.error('Error updating case count:', updateError);
      return { success: false, error: updateError };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in incrementCaseCount:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error updating case count') 
    };
  }
};
