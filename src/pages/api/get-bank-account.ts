import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorization } = req.headers;
    const { user_id } = req.query;

    // Verify user is authenticated
    const token = authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user || user.id !== user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get bank account information from the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('bank_name, bank_account_number, bank_account_name, bank_rut, bank_email')
      .eq('id', user_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching bank account:', error);
      return res.status(500).json({ error: 'Error fetching bank account information' });
    }

    // Return the data or null if no record found
    return res.status(200).json(data || null);
  } catch (error) {
    console.error('Error in get-bank-account:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
