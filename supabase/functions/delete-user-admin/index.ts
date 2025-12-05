import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Delete user function called')
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      throw new Error('No authorization header')
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user to verify they're admin
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    console.log('User:', user?.email)

    if (!user) {
      console.error('Not authenticated')
      throw new Error('Not authenticated')
    }

    // Check if user is admin
    const isAdmin = user.email === 'gigfmedia@icloud.com' || 
                    user.email === 'admin@example.com' ||
                    user.user_metadata?.role === 'admin'

    console.log('Is admin:', isAdmin, 'Email:', user.email, 'Role:', user.user_metadata?.role)

    if (!isAdmin) {
      console.error('Not authorized - admin access required')
      throw new Error('Not authorized - admin access required')
    }

    // Get the userId from the request body
    const { userId } = await req.json()

    console.log('Deleting user:', userId)

    if (!userId) {
      throw new Error('userId is required')
    }

    // Create admin client with service role key
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')
    console.log('Service role key present:', !!serviceRoleKey)
    
    if (!serviceRoleKey) {
      throw new Error('SERVICE_ROLE_KEY not configured')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
    )

    // Delete all related data first to avoid foreign key constraints
    try {
      console.log('Deleting related data...')
      
      // CRITICAL: Delete messages first (most common cause of foreign key errors)
      await supabaseAdmin.from('messages').delete().eq('receiver_id', userId)
      await supabaseAdmin.from('messages').delete().eq('sender_id', userId)
      
      // Delete from profiles
      await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      
      // Delete from consultations (as client)
      await supabaseAdmin.from('consultations').delete().eq('client_id', userId)
      
      // Delete from consultations (as lawyer)
      await supabaseAdmin.from('consultations').delete().eq('lawyer_id', userId)
      
      // Delete from appointments (as user)
      await supabaseAdmin.from('appointments').delete().eq('user_id', userId)
      
      // Delete from payments (as client)
      await supabaseAdmin.from('payments').delete().eq('client_user_id', userId)
      
      // Delete from payments (as lawyer)
      await supabaseAdmin.from('payments').delete().eq('lawyer_user_id', userId)
      
      // Delete from notifications
      await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
      
      // Delete from favorites
      await supabaseAdmin.from('favorites').delete().eq('user_id', userId)
      
      // Delete from lawyer_services
      await supabaseAdmin.from('lawyer_services').delete().eq('lawyer_user_id', userId)
      
      // Delete from linkedin_profiles
      await supabaseAdmin.from('linkedin_profiles').delete().eq('user_id', userId)
      
      console.log('Related data deleted')
    } catch (cleanupError) {
      console.error('Error cleaning up related data:', cleanupError)
      // Continue anyway, some tables might not exist or have data
    }

    console.log('Deleting from auth tables...')
    
    // Delete from auth tables
    await supabaseAdmin.from('auth.identities').delete().eq('user_id', userId)
    await supabaseAdmin.from('auth.sessions').delete().eq('user_id', userId)
    await supabaseAdmin.from('auth.refresh_tokens').delete().eq('user_id', userId)

    console.log('Deleting user from auth.users...')
    
    // Now delete user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      throw deleteError
    }

    console.log('User deleted successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
