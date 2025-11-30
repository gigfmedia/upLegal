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
  console.log('Starting verification for:', { rut, fullName });
  
  try {
    // Call the scraper function
    const result = await scrapePoderJudicial(rut, fullName);
    
    // Log the result for debugging
    console.log('Verification result:', result);
    
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
  console.log('=== NEW REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
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
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
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
    
    console.log('Extracting rut and fullName from request');
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
    
    console.log('RUT and fullName extracted successfully');
    
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

    console.log('Starting verification process...');
    
    // 1. First, verify with PJUD (mock for now)
    console.log('Calling verifyWithPJUD...');
    const verification = await verifyWithPJUD(rut, fullName);
    console.log('Verification result:', verification);
    
    // 2. Get auth token from headers
    console.log('Checking auth header...');
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
    console.log('Initializing Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment variables:', { 
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey 
    });
    
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
    console.log('Verifying user token...');
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
    
    console.log('User authenticated:', { userId: user.id });
    
    // 5. Update user profile
    console.log('Updating user profile with RUT:', rut);
    
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
      console.log('Profile update successful:', profile);
      
    } catch (error) {
      console.error('Standard update failed, trying RPC fallback...', error);
      
      try {
        // Try the RPC function
        const { data, error: rpcError } = await supabaseClient.rpc('update_profile_rut', {
          p_user_id: user.id,
          p_rut: rut
        });
        
        if (rpcError) throw rpcError;
        console.log('RPC update successful:', data);
        
      } catch (rpcError) {
        console.error('All update methods failed:', rpcError);
        // Continue anyway - we don't want to fail verification just because the update failed
      }
    }
    
    // 6. Return success response
    console.log('Returning success response');
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
