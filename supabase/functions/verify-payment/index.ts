import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { sessionId } = await req.json();

    console.log("Verifying payment for session:", sessionId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("Stripe session status:", session.payment_status);

    // Update payment status in database using service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let status = "pending";
    if (session.payment_status === "paid") {
      status = "paid";
    } else if (session.payment_status === "unpaid") {
      status = "failed";
    }

    const { error: updateError } = await supabaseService
      .from("payments")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("stripe_session_id", sessionId);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw new Error("Failed to update payment status");
    }

    console.log("Payment status updated to:", status);

    return new Response(JSON.stringify({ 
      status,
      sessionId,
      paymentStatus: session.payment_status 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});