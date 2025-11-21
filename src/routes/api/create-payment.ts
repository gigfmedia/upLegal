import { json } from '@sveltejs/kit';
import { createPreference } from '$lib/mercadopago';
import { supabase } from '$lib/supabaseClient';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const {
      amount,
      userId,
      lawyerId,
      description,
      successUrl,
      failureUrl,
      pendingUrl,
      userEmail,
      userName,
      serviceId = 'default-service'
    } = await request.json();

    // Generate a unique ID for this payment
    const paymentId = crypto.randomUUID();
    
    // Calculate amounts
    const clientAmount = Math.round(amount * 1.1); // 10% surcharge
    const platformFee = Math.round(amount * 0.2); // 20% platform fee
    const lawyerAmount = amount - platformFee;

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        client_user_id: userId,
        lawyer_user_id: lawyerId,
        total_amount: clientAmount,
        lawyer_amount: lawyerAmount,
        platform_fee: platformFee,
        status: 'pending',
        currency: 'CLP',
        service_description: JSON.stringify({
          service_id: serviceId,
          description: description,
          client_surcharge: Math.round(amount * 0.1),
          payment_provider: 'mercadopago',
          created_at: new Date().toISOString(),
          success_url: successUrl,
          failure_url: failureUrl,
          pending_url: pendingUrl
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return json({ error: paymentError.message }, { status: 400 });
    }

    // Create MercadoPago preference
    const items = [{
      id: serviceId,
      title: description.substring(0, 255) || 'Servicio Legal',
      description: description.substring(0, 500),
      quantity: 1,
      currency_id: 'CLP',
      unit_price: clientAmount,
    }];

    const payer = {
      email: userEmail,
      ...(userName && { name: userName })
    };

    const preferenceUrl = await createPreference(items, payer);

    // Update payment record with preference URL
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        service_description: JSON.stringify({
          ...JSON.parse(payment.service_description || '{}'),
          payment_link: preferenceUrl,
          updated_at: new Date().toISOString()
        }),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment record:', updateError);
      return json({ error: updateError.message }, { status: 500 });
    }

    return json({ paymentId, paymentUrl: preferenceUrl });
  } catch (error) {
    console.error('Error in create-payment endpoint:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
