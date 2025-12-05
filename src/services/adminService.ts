import { supabase } from '@/lib/supabaseClient';

export const adminService = {
  async deleteUser(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Error getting session:', sessionError);
        return { error: 'Not authenticated. Please log in again.' };
      }

      console.log('Attempting to delete user:', userId);
      
      // Call the Edge Function to delete the user from auth.users
      try {
        const { data, error } = await supabase.functions.invoke('delete-user-admin', {
          body: { userId }
        });

        console.log('Edge Function response:', { data, error });

        if (error) {
          console.error('Error calling delete function:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          
          // Try to get more details from the error
          const errorMessage = data?.error || error.message || 'Failed to delete user';
          return { error: errorMessage };
        }

        if (data?.error) {
          console.error('Error from delete function:', data.error);
          return { error: data.error };
        }

        console.log('User deleted successfully');
        return { success: true };
      } catch (err) {
        console.error('Exception calling Edge Function:', err);
        return { error: err instanceof Error ? err.message : 'Unknown error' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in adminService.deleteUser:', error);
      return { error: errorMessage };
    }
  },

  async getUsers() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Authentication error:', userError);
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('Fetching users...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Fetched users:', data?.length || 0);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in adminService.getUsers:', error);
      return { 
        data: null, 
        error: error.message || 'Failed to fetch users' 
      };
    }
  }
};
