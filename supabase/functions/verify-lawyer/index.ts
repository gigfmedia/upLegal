import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scrapePoderJudicial } from './scraper.ts';

// Create a function to check if a column exists in a table
const columnExistsSQL = `
  create or replace function column_exists(table_name text, column_name text)
  returns boolean as $$
  declare
    column_exists boolean;
  begin
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
    ) into column_exists;
    
    return column_exists;
  end;
  $$ language plpgsql security definer;`;

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Verification service using Poder Judicial web scraping
 */
async function verifyWithPJUD(rut: string, fullName: string): Promise<{verified: boolean, message?: string, data?: any}> {
  
  try {
    // Call the scraper function
    const result = await scrapePoderJudicial(rut, fullName);
    return result;
  } catch (error) {
    console.error('Error in verification process:', error);
    return {
      verified: false,
      message: 'Error en el proceso de verificación. Por favor, intente nuevamente.'
    };
  }
}

// Helper function to create a JSON response
function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// Main request handler
serve(async (req) => {
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    const error = `Method not allowed: ${req.method}`;
    console.error(error);
    return jsonResponse({ error }, 405);
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      const error = 'Error parsing request body';
      console.error(error, parseError);
      return jsonResponse(
        { 
          error: 'Error al analizar el cuerpo de la solicitud',
          details: parseError.message,
          timestamp: new Date().toISOString()
        },
        400
      );
    }
    
    const { rut, fullName } = requestBody;
    
    if (!rut || !fullName) {
      const error = 'Missing required fields: rut and fullName are required';
      console.error(error);
      return jsonResponse(
        { 
          error: 'Se requieren RUT y nombre completo',
          timestamp: new Date().toISOString()
        },
        400
      );
    }
    
    // Validate request
    if (!rut || !fullName) {
      const errorMsg = 'Se requieren RUT y nombre completo';
      console.error('Validation error:', errorMsg);
      return jsonResponse(
        { 
          error: errorMsg,
          timestamp: new Date().toISOString()
        },
        400
      );
    }
    
    // 1. First, verify with PJUD (mock for now)
    const verification = await verifyWithPJUD(rut, fullName);
    
    // 2. Get auth token from headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const error = 'No authorization header provided';
      console.error(error);
      return jsonResponse(
        { 
          error: 'No se proporcionó token de autenticación',
          timestamp: new Date().toISOString()
        },
        401
      );
    }
    
    // 3. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      const error = 'Missing Supabase environment variables';
      console.error(error);
      return jsonResponse(
        { 
          error: 'Error de configuración del servidor',
          timestamp: new Date().toISOString()
        },
        500
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // 4. Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Authentication failed:', userError?.message || 'No user data');
      return jsonResponse(
        { 
          error: 'Error de autenticación',
          timestamp: new Date().toISOString()
        },
        401
      );
    }
    
    // 5. Update user profile
    try {
      // First try the standard update
      const { data: profile, error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          rut: rut,
          updated_at: new Date().toISOString(),
          ...(verification.message && { verification_message: verification.message })
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Standard update failed, trying RPC fallback...', error);
      
      try {
        // Try the RPC function
        const { data, error: rpcError } = await supabaseClient.rpc('update_profile_rut', {
          p_user_id: user.id,
          p_rut: rut
        });
        
        if (rpcError) throw rpcError;
      } catch (rpcError) {
        console.error('All update methods failed:', rpcError);
        // Continue anyway - we don't want to fail verification just because the update failed
      }
    }
    
    // 6. Return success response
    return jsonResponse({
      success: true,
      verified: true,
      message: 'Verificación exitosa',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in verify-lawyer function:', error);
    
    return jsonResponse(
      {
        error: 'Error en el servidor',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      500
    );
  }
});
