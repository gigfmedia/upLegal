import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the current authenticated user from the session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Get user's MercadoPago access token from the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('mercado_pago_user_id, mercado_pago_access_token')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile?.mercado_pago_access_token) {
      return res.status(400).json({ error: 'Usuario no conectado a MercadoPago' });
    }

    // Get user info from MercadoPago
    const response = await axios.get(
      `https://api.mercadopago.com/v1/users/${profile.mercado_pago_user_id}`,
      {
        headers: {
          Authorization: `Bearer ${profile.mercado_pago_access_token}`,
        },
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error al obtener información del usuario de MercadoPago:', error);
    return res.status(500).json({ 
      error: 'Error al obtener información del usuario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
