import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3001',
  'https://your-production-domain.com' // Replace with your production domain
];

// Helper to create CORS response
const corsResponse = (status: number, body: any, origin: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  };

  // Set the allowed origin if it's in our list
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    // Default to first allowed origin if origin is not in the list
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
  }

  return new Response(JSON.stringify(body), {
    status,
    headers
  });
};

// Helper to create error responses
const errorResponse = (status: number, message: string, details?: any, origin: string | null = null) => {
  console.error(`Error ${status}: ${message}`, details);
  return corsResponse(status, { 
    error: message,
    details: details?.message || details 
  }, origin);
};

// Main function handler
serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse(200, { status: 'ok' }, origin);
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return errorResponse(500, 'Server configuration error', 'Missing required environment variables', origin);
    }

    // Check authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Not authenticated', 'No authorization header found', origin);
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return errorResponse(401, 'Not authenticated', 'No token provided', origin);
    }

    // Parse request body
    let userId: string;
    try {
      const body = await req.json();
      userId = body.userId;
      if (!userId) {
        return errorResponse(400, 'Missing userId in request body', null, origin);
      }
    } catch (e) {
      return errorResponse(400, 'Invalid request body', e, origin);
    }

    // Initialize Supabase clients
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey
        } 
      },
      auth: { 
        persistSession: false, 
        detectSessionInUrl: false,
        autoRefreshToken: false
      }
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { 
        persistSession: false, 
        detectSessionInUrl: false,
        autoRefreshToken: false
      }
    });

    // Get the current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return errorResponse(401, 'Not authenticated', userError, origin);
    }

    // Check if user is an admin (has 'lawyer' role in profiles)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'lawyer') {
      return errorResponse(403, 'Forbidden', 'Insufficient permissions', origin);
    }

    // Delete the target user's profile first
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (profileDeleteError) {
      console.error('Failed to delete profile:', profileDeleteError);
      // Continue with user deletion even if profile deletion fails
    }

    // Delete the target user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      return errorResponse(500, 'Failed to delete user', deleteError, origin);
    }

    // Return success response
    return corsResponse(200, { 
      success: true,
      message: 'User deleted successfully' 
    }, origin);

  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse(500, 'Internal server error', error, origin);
  }
});
