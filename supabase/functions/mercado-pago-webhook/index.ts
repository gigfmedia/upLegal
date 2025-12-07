import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookData {
  type: string;
  data: {
    id: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the webhook signature (you should implement this)
    // const signature = req.headers.get('x-signature');
    // if (!verifySignature(signature, await req.text())) {
    //   return new Response('Invalid signature', { status: 401 });
    // }

    const webhookData: WebhookData = await req.json();
    
    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data.id;
      
      // Get the payment details from MercadoPago
      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!mpAccessToken) {
        throw new Error('MercadoPago access token not configured');
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment details from MercadoPago');
      }

      const payment = await response.json();
      
      // Update the payment status in your database
      const { error } = await supabaseAdmin
        .from('payments')
        .update({
          status: payment.status === 'approved' ? 'succeeded' : payment.status,
          payment_method: payment.payment_type_id,
          payment_status: payment.status,
          metadata: {
            ...payment,
            last_webhook: new Date().toISOString(),
          },
        })
        .eq('id', payment.external_reference);

      if (error) {
        console.error('Error updating payment:', error);
        throw new Error('Failed to update payment status');
      }

      // If payment is approved, you might want to trigger other actions here
      if (payment.status === 'approved') {
        // Example: Send confirmation email, create appointment, etc.
        //console.log('Payment approved:', payment.id);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error processing webhook'
      }),
      {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
