import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const MP_CLIENT_ID = import.meta.env.VITE_MERCADOPAGO_CLIENT_ID || '';
const MP_CLIENT_SECRET = import.meta.env.VITE_MERCADOPAGO_CLIENT_SECRET || '';

interface OAuthResponse {
  access_token: string;
  refresh_token: string;
  public_key: string;
  user_id: number;
  expires_in: number;
  scope: string;
  token_type: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código de autorización no proporcionado' });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post<OAuthResponse>(
      'https://api.mercadopago.com/oauth/token',
      null,
      {
        params: {
          client_id: MP_CLIENT_ID,
          client_secret: MP_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${import.meta.env.VITE_APP_URL}/api/mercadopago/oauth/callback`,
        },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const { access_token, refresh_token, user_id, public_key } = tokenResponse.data;

    // Get user info from MercadoPago
    const userResponse = await axios.get(`https://api.mercadopago.com/v1/users/${user_id}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // Get the current authenticated user from the session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Save MercadoPago credentials to the user's profile
    const { error } = await supabase
      .from('profiles')
      .update({
        mercado_pago_access_token: access_token,
        mercado_pago_refresh_token: refresh_token,
        mercado_pago_public_key: public_key,
        mercado_pago_user_id: user_id,
        mercado_pago_connected: true,
        mercado_pago_email: userResponse.data.email,
        mercado_pago_nickname: userResponse.data.nickname,
        mercado_pago_connected_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error al guardar credenciales de MercadoPago:', error);
      throw error;
    }

    // Redirect to the earnings page with success message
    return res.redirect('/lawyer/earnings?mp_connected=success');
  } catch (error) {
    console.error('Error en el callback de MercadoPago:', error);
    // Redirect to the earnings page with error message
    return res.redirect('/lawyer/earnings?mp_connected=error');
  }
}
