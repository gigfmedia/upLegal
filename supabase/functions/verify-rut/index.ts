import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { rut } = await req.json();

    if (!rut) {
      return new Response(
        JSON.stringify({ valid: false, message: 'El RUT es requerido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Call Render server
    const RENDER_SERVER_URL = 'https://uplegal-service.onrender.com';
    
    const response = await fetch(`${RENDER_SERVER_URL}/verify-rut`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rut })
    });

    if (!response.ok) {
      console.error('Error from Render server:', response.statusText);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Error al conectar con el servicio de verificación' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error verifying RUT:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: 'Error al procesar la verificación del RUT',
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
