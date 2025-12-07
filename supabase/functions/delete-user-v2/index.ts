import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3001',
  'https://your-production-domain.com' // Replace with your production domain
];

// Helper to create CORS headers
const createCorsHeaders = (origin: string | null) => {
  const headers = new Headers();
  
  // Set the allowed origin if it's in our list
  const allowedOrigin = origin && allowedOrigins.includes(origin) 
    ? origin 
    : allowedOrigins[0];
    
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Content-Type', 'application/json');
  
  return headers;
};

// Helper to create error responses
const errorResponse = (status: number, message: string, details?: any, origin: string | null = null) => {
  console.error(`Error ${status}: ${message}`, details);
  
  const headers = createCorsHeaders(origin);
  const body = JSON.stringify({ 
    error: message,
    details: details?.message || details 
  });
  
  return new Response(body, {
    status,
    headers
  });
};

// Main function handler
serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = createCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers, status: 200 });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('Missing environment variables');
      return errorResponse(500, 'Server configuration error', 'Missing required environment variables', origin);
    }

    // Check authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      return errorResponse(401, 'Not authenticated', 'No authorization header found', origin);
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      console.error('No token provided');
      return errorResponse(401, 'Not authenticated', 'No token provided', origin);
    }

    // Parse request body
    let userId: string;
    try {
      const body = await req.json();
      userId = body.userId;
      if (!userId) {
        console.error('No userId in request body');
        return errorResponse(400, 'Missing userId in request body', null, origin);
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
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
        autoRefreshToken: false
      }
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Get the current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return errorResponse(401, 'Not authenticated', userError, origin);
    }

    // Check if user is an admin (has 'lawyer' role in profiles)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'lawyer') {
      console.error('User is not authorized to delete users:', { 
        userId: user.id, 
        role: profile?.role 
      });
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
      console.error('Failed to delete user:', deleteError);
      return errorResponse(500, 'Failed to delete user', deleteError, origin);
    }

    // Return success response
    const body = JSON.stringify({ 
      success: true,
      message: 'User deleted successfully' 
    });
    
    return new Response(body, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse(500, 'Internal server error', error, origin);
  }
});
