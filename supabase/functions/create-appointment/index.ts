import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

interface AppointmentData {
  title: string;
  description?: string;
  type: 'video' | 'phone' | 'in-person';
  lawyer_id: string;
  client_id: string;
  date: string;
  time: string;
  duration?: number;
  location?: string;
  meeting_link?: string;
  price: number;
  notes?: string;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the token from the header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    const appointmentData: AppointmentData = await req.json();
    
    // Validate required fields
    if (!appointmentData.title || !appointmentData.type || !appointmentData.lawyer_id || 
        !appointmentData.client_id || !appointmentData.date || !appointmentData.time || 
        appointmentData.price === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user is the client or the lawyer
    if (user.id !== appointmentData.client_id && user.id !== appointmentData.lawyer_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to create this appointment' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set default values
    const appointment = {
      ...appointmentData,
      status: appointmentData.status || 'scheduled',
      duration: appointmentData.duration || 60,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert the appointment into the database
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointment])
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the created appointment
    return new Response(
      JSON.stringify(data),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
