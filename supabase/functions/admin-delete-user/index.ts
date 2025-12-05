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

  // Log the incoming request
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('URL');
    const supabaseAnonKey = Deno.env.get('ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

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
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, detectSessionInUrl: false }
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, detectSessionInUrl: false }
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

    // Delete the target user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      return errorResponse(500, 'Failed to delete user', deleteError, origin);
    }

    // Also delete the profile
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (profileDeleteError) {
      console.error('Failed to delete profile:', profileDeleteError);
      // Continue even if profile deletion fails
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
      userId: user.id, 
      name: `${profile.first_name} ${profile.last_name}`,
      role: profile.role 
    });

    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body:', requestBody);
    } catch (e) {
      throw new Error('Invalid request body');
    }

    const { userId } = requestBody;
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Prevent deleting yourself
    if (userId === user.id) {
      throw new Error('Cannot delete your own account');
    }

    // Check if the target user exists and is not an admin
    const { data: targetUser, error: targetUserError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      console.error('Target user not found:', targetUserError);
      throw new Error('User not found');
    }

    if (targetUser.role === 'admin') {
      throw new Error('Cannot delete other admin users');
    }

    // Create an admin client with service role for user deletion
    console.log('Creating admin client with service role');
    let adminClient;
    try {
      adminClient = createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
      )
      console.log('Admin client created successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating admin client:', errorMessage);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize admin client',
          details: errorMessage 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Deleting user profile:', userId);
    // Delete the user's profile first
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      throw profileDeleteError;
    }

    console.log('Deleting auth user:', userId);
    // Then delete the auth user
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      throw authDeleteError;
    }

    console.log('User deleted successfully:', userId);
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error in admin-delete-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.details || null
      }),
      { 
        status: error.status || 500,
        headers: corsHeaders
      }
    );
  }
});
