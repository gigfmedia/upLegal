import { json } from '@sveltejs/kit';
import { createPreference } from '$lib/mercadopago';
import { supabase } from '$lib/supabaseClient';

const DEFAULT_CLIENT_SURCHARGE_PERCENT = 0.1;
const DEFAULT_PLATFORM_FEE_PERCENT = 0.2;
const DEFAULT_CURRENCY = 'CLP';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const {
      amount,
      originalAmount,
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

    if ((!amount && !originalAmount) || !userId || !lawyerId) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const numericAmount = Number(amount ?? originalAmount);

    if (!Number.isFinite(numericAmount) || numericAmount < 1000) {
      return json({ error: 'Amount must be at least 1000 CLP' }, { status: 400 });
    }

    // Load platform settings with fallback
    let clientSurchargePercent = DEFAULT_CLIENT_SURCHARGE_PERCENT;
    let platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT;
    let currency = DEFAULT_CURRENCY;

    const { data: settingsData } = await supabase
      .from('platform_settings')
      .select('client_surcharge_percent, platform_fee_percent, currency')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsData) {
      clientSurchargePercent = Number(settingsData.client_surcharge_percent ?? clientSurchargePercent);
      platformFeePercent = Number(settingsData.platform_fee_percent ?? platformFeePercent);
      currency = settingsData.currency ?? currency;
    }

    const paymentId = crypto.randomUUID();

    const hasOriginalAmount = typeof originalAmount === 'number' && Number.isFinite(originalAmount) && originalAmount > 0;
    const derivedOriginalAmount = hasOriginalAmount
      ? Math.round(Number(originalAmount))
      : Math.round(numericAmount / (1 + clientSurchargePercent));

    const clientAmount = hasOriginalAmount
      ? Math.round(Number(originalAmount) * (1 + clientSurchargePercent))
      : Math.round(numericAmount);

    const clientSurcharge = Math.max(clientAmount - derivedOriginalAmount, 0);
    const platformFee = Math.round(derivedOriginalAmount * platformFeePercent);
    const lawyerAmount = Math.max(derivedOriginalAmount - platformFee, 0);

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        client_user_id: userId,
        lawyer_user_id: lawyerId,
        total_amount: clientAmount,
        original_amount: derivedOriginalAmount,
        client_surcharge: clientSurcharge,
        client_surcharge_percent: clientSurchargePercent,
        platform_fee_percent: platformFeePercent,
        lawyer_amount: lawyerAmount,
        platform_fee: platformFee,
        status: 'pending',
        currency,
        service_description: JSON.stringify({
          service_id: serviceId,
          description: description,
          client_surcharge: clientSurcharge,
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
      currency_id: currency,
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
