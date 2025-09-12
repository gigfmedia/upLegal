import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorization } = req.headers;
    const { user_id, bank_name, account_number, account_name, rut, email } = req.body;

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

    // Save bank account information to the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user_id,
          bank_name,
          bank_account_number: account_number,
          bank_account_name: account_name,
          bank_rut: rut,
          bank_email: email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      console.error('Error saving bank account:', error);
      return res.status(500).json({ error: 'Error saving bank account information' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in save-bank-account:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
