import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
}

interface PaymentRecord {
  id: string
  lawyer_user_id: string
  lawyer_amount: number
  currency: string | null
}

interface PayoutGroup {
  lawyerId: string
  totalAmount: number
  currency: string
  paymentIds: string[]
}

const DEFAULT_CURRENCY = 'CLP'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }

  // Validate cron secret
  try {
    validateSecret(req)
  } catch (error) {
    console.error('Auth error:', error)
    return new Response(JSON.stringify({ 
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid authentication'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const cutoffDate = getPreviousMonday()
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, lawyer_user_id, lawyer_amount, currency, created_at')
      .eq('status', 'succeeded')
      .eq('payout_status', 'pending')
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      throw new Error(`Failed to fetch pending payments: ${error.message}`)
    }

    if (!payments || payments.length === 0) {
      return jsonResponse({ message: 'No pending payouts', processed: [] })
    }

    const grouped = groupPayments(payments)
    const results = [] as Array<{ lawyerId: string; status: 'completed' | 'skipped' | 'failed'; reason?: string }>

    for (const payout of grouped) {
      const result = await processPayout(supabase, payout)
      results.push(result)
    }

    return jsonResponse({
      message: 'Payout batch finished',
      processed: results,
    })
  } catch (error) {
    console.error('process-weekly-payouts error:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      500
    )
  }
})

function validateSecret(req: Request) {
  const configuredSecret = Deno.env.get('PAYOUT_CRON_SECRET');
  console.log('Configured secret exists:', !!configuredSecret);
  console.log('Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

  if (!configuredSecret) {
    console.warn('PAYOUT_CRON_SECRET is not set; skipping auth guard');
    return;
  }

  const headerSecret = req.headers.get('x-cron-secret');
  console.log('Header secret received:', headerSecret);

  if (!headerSecret || headerSecret !== configuredSecret) {
    throw new Error(`Unauthorized: missing or invalid cron secret. Received: ${headerSecret}`);
  }
}

function getPreviousMonday() {
  const date = new Date()
  const day = date.getDay()
  const diff = (day === 0 ? 6 : day - 1) // convert Sunday=0 to 6
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function groupPayments(payments: PaymentRecord[]): PayoutGroup[] {
  const map = new Map<string, PayoutGroup>()

  payments.forEach((payment) => {
    if (!payment.lawyer_user_id) return

    if (!map.has(payment.lawyer_user_id)) {
      map.set(payment.lawyer_user_id, {
        lawyerId: payment.lawyer_user_id,
        totalAmount: 0,
        currency: payment.currency ?? DEFAULT_CURRENCY,
        paymentIds: [],
      })
    }

    const group = map.get(payment.lawyer_user_id)!
    group.totalAmount += payment.lawyer_amount ?? 0
    group.paymentIds.push(payment.id)
    if (!group.currency && payment.currency) {
      group.currency = payment.currency
    }
  })

  return Array.from(map.values()).filter((group) => group.totalAmount > 0)
}

async function processPayout(supabase: ReturnType<typeof createClient>, payout: PayoutGroup) {
  try {
    const { data: lawyer, error: profileError } = await supabase
      .from('profiles')
      .select('mp_access_token, email, full_name')
      .eq('id', payout.lawyerId)
      .single()

    if (profileError) {
      await markPaymentsFailed(supabase, payout.paymentIds, `Perfil no encontrado: ${profileError.message}`)
      console.error('Perfil no encontrado para abogado', payout.lawyerId, profileError)
      return { lawyerId: payout.lawyerId, status: 'failed', reason: 'Perfil no encontrado' } as const
    }

    if (!lawyer?.mp_access_token) {
      const reason = 'El abogado no tiene configurado su token de MercadoPago'
      await markPaymentsFailed(supabase, payout.paymentIds, reason)
      return { lawyerId: payout.lawyerId, status: 'failed', reason } as const
    }

    const transfer = await createTransfer(payout, lawyer.mp_access_token)

    await supabase
      .from('payments')
      .update({
        payout_status: 'completed',
        payout_date: new Date().toISOString(),
        payout_reference: transfer?.id ?? null,
        payout_error: null,
      })
      .in('id', payout.paymentIds)

    await supabase.from('payout_logs').insert({
      lawyer_user_id: payout.lawyerId,
      total_amount: payout.totalAmount,
      payment_ids: payout.paymentIds,
      status: 'completed',
      reference: transfer?.id ?? null,
      metadata: transfer ?? null,
    })

    return { lawyerId: payout.lawyerId, status: 'completed' } as const
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error procesando payout', payout.lawyerId, message)

    await markPaymentsFailed(supabase, payout.paymentIds, message)
    await supabase.from('payout_logs').insert({
      lawyer_user_id: payout.lawyerId,
      total_amount: payout.totalAmount,
      payment_ids: payout.paymentIds,
      status: 'failed',
      error: message,
    })

    return { lawyerId: payout.lawyerId, status: 'failed', reason: message } as const
  }
}

async function markPaymentsFailed(supabase: ReturnType<typeof createClient>, paymentIds: string[], reason: string) {
  if (paymentIds.length === 0) return

  await supabase
    .from('payments')
    .update({ payout_status: 'error', payout_error: reason })
    .in('id', paymentIds)
}

async function createTransfer(payout: PayoutGroup, lawyerAccessToken: string) {
  const platformToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  if (!platformToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured')
  }

  // The lawyer token is currently only used as a sanity check. Include it for auditing.
  const payload = {
    amount: payout.totalAmount,
    currency_id: payout.currency || DEFAULT_CURRENCY,
    user_id: payout.lawyerId,
    external_reference: `PAYOUT-${new Date().toISOString()}`,
    metadata: {
      payment_ids: payout.paymentIds,
      lawyer_access_token_present: Boolean(lawyerAccessToken),
    },
  }

  const response = await fetch('https://api.mercadopago.com/v1/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${platformToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MercadoPago transfer error (${response.status}): ${errorText}`)
  }

  return await response.json()
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
