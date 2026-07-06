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
      
      // Check if this is a service quote request payment
      const { data: quoteRequest } = await supabaseAdmin
        .from('service_quote_requests')
        .select('id, status, quoted_price')
        .eq('id', payment.external_reference)
        .maybeSingle();

      if (quoteRequest) {
        // Handle service quote request payment
        if (payment.status === 'approved' && quoteRequest.status !== 'paid') {
          const { error: updateError } = await supabaseAdmin
            .from('service_quote_requests')
            .update({
              status: 'paid',
              payment_status: payment.status,
              payment_id: paymentId,
              paid_at: new Date().toISOString(),
            })
            .eq('id', payment.external_reference);

          if (updateError) {
            console.error('Error updating quote request:', updateError);
            throw new Error('Failed to update quote request status');
          }

          console.log(`Quote request ${payment.external_reference} marked as paid`);
        }
      } else {
        // Handle regular payment (existing logic)
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
