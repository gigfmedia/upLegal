import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const MP_CLIENT_ID = import.meta.env.VITE_MERCADOPAGO_CLIENT_ID || '';
const MP_CLIENT_SECRET = import.meta.env.VITE_MERCADOPAGO_CLIENT_SECRET || '';

interface TokenRequest {
  code: string;
}

interface TokenResponse {
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body as TokenRequest;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post<TokenResponse>(
      'https://api.mercadopago.com/oauth/token',
      null,
      {
        params: {
          client_id: MP_CLIENT_ID,
          client_secret: MP_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/oauth/callback`,
        },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    // Get user info from MercadoPago
    const userResponse = await axios.get(
      `https://api.mercadopago.com/v1/users/${tokenResponse.data.user_id}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`,
        },
      }
    );

    // Get the current authenticated user from the session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Save MercadoPago credentials to the user's profile
    const { error } = await supabase
      .from('profiles')
      .update({
        mercado_pago_access_token: tokenResponse.data.access_token,
        mercado_pago_refresh_token: tokenResponse.data.refresh_token,
        mercado_pago_public_key: tokenResponse.data.public_key,
        mercado_pago_user_id: tokenResponse.data.user_id,
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

    return res.status(200).json({
      success: true,
      access_token: tokenResponse.data.access_token,
      refresh_token: tokenResponse.data.refresh_token,
      public_key: tokenResponse.data.public_key,
      user_id: tokenResponse.data.user_id,
    });
  } catch (error) {
    console.error('Error en el intercambio de tokens de MercadoPago:', error);
    return res.status(500).json({ 
      error: 'Error al procesar la autenticación con MercadoPago',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
