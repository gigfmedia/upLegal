import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  lawyerId: string;
  amount: number; // Amount in currency's smallest unit (CLP has no decimals)
  serviceDescription: string;
  email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Parse request body
    const { lawyerId, amount, serviceDescription, email }: PaymentRequest = await req.json();

    // Try to get authenticated user (optional)
    let userId: string | null = null;
    let customerEmail = email || "guest@example.com";
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        customerEmail = userData.user.email || customerEmail;
      }
    }

    console.log("Creating payment for:", { userId, lawyerId, amount, serviceDescription, customerEmail });

    // Enforce minimum amount in CLP to satisfy Stripe's 50¢ USD equivalent
    const MIN_AMOUNT_CLP = 1000;
    const finalAmount = Math.max(Math.round(amount), MIN_AMOUNT_CLP);

    // Calculate platform fee (15%) and lawyer amount (85%) based on final amount
    const platformFee = Math.round(finalAmount * 0.15);
    const lawyerAmount = finalAmount - platformFee;

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: customerEmail, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price_data: {
            currency: "clp",
            product_data: { 
              name: `Legal Service - ${serviceDescription}`,
              description: `Legal service provided by lawyer ID: ${lawyerId}`
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled`,
      metadata: {
        client_user_id: userId ?? "guest",
        lawyer_user_id: lawyerId,
        platform_fee: platformFee.toString(),
        lawyer_amount: lawyerAmount.toString(),
      },
    });

    // Create payment record in database using service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: insertError } = await supabaseService
      .from("payments")
      .insert({
        client_user_id: userId,
        lawyer_user_id: lawyerId,
        stripe_session_id: session.id,
        total_amount: finalAmount,
        lawyer_amount: lawyerAmount,
        platform_fee: platformFee,
        currency: "clp",
        status: "pending",
        service_description: serviceDescription,
      });

    if (insertError) {
      console.error("Error inserting payment:", insertError);
      throw new Error("Failed to create payment record");
    }

    console.log("Payment created successfully:", session.id, "amount:", finalAmount);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});