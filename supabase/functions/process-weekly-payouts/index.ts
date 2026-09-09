import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
}

interface PaymentRecord {
  id: string
  lawyer_id: string
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
      .select('id, lawyer_id, lawyer_amount, currency, created_at')
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
    const results = [] as Array<{ lawyerId: string; status: 'completed' | 'skipped' | 'failed' | 'reconciliation_required'; reason?: string }>

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

  if (!configuredSecret) {
    throw new Error('PAYOUT_CRON_SECRET is not configured');
  }

  const headerSecret = req.headers.get('x-cron-secret');

  if (!headerSecret || headerSecret !== configuredSecret) {
    throw new Error('Unauthorized: missing or invalid cron secret');
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
    const canonicalLawyerId = payment.lawyer_id
    if (!canonicalLawyerId) return

    if (!map.has(canonicalLawyerId)) {
      map.set(canonicalLawyerId, {
        lawyerId: canonicalLawyerId,
        totalAmount: 0,
        currency: payment.currency ?? DEFAULT_CURRENCY,
        paymentIds: [],
      })
    }

    const group = map.get(canonicalLawyerId)!
    group.paymentIds.push(payment.id)
    if (!group.currency && payment.currency) {
      group.currency = payment.currency
    }
  })

  return Array.from(map.values())
}

async function processPayout(supabase: SupabaseClient, payout: PayoutGroup) {
  // Claim payments atomically to prevent concurrent double-processing
  const { data: claimed, error: claimError } = await supabase
    .from('payments')
    .update({ payout_status: 'processing', payout_error: null })
    .in('id', payout.paymentIds)
    .eq('payout_status', 'pending')
    .eq('status', 'succeeded')
    .eq('lawyer_id', payout.lawyerId)
    .select('id, lawyer_id, lawyer_amount, currency');
  if (claimError) {
    throw new Error('Payout claim failed; reconciliation may be required');
  }
  if (!claimed || claimed.length === 0) {
    return { lawyerId: payout.lawyerId, status: 'skipped' as const, reason: 'Already processing or claimed' };
  }
  // Never use the candidate total; only this atomic transition authorizes payment.
  payout = { ...payout, paymentIds: claimed.map((row: PaymentRecord) => row.id), totalAmount: 0, currency: DEFAULT_CURRENCY };
  let providerConfirmed = false;
  let requestedAmount = 0;
  let transferReference: string | null = null;
  try {
    for (const row of claimed as PaymentRecord[]) {
      if (row.lawyer_id !== payout.lawyerId || row.currency !== DEFAULT_CURRENCY) {
        throw new Error('Claimed payments have inconsistent lawyer or currency');
      }
      if (!Number.isSafeInteger(row.lawyer_amount) || row.lawyer_amount <= 0) {
        throw new Error('Invalid claimed lawyer_amount; manual review required');
      }
      payout.totalAmount += row.lawyer_amount;
    }
    // payout_logs.total_amount is a PostgreSQL INTEGER.
    if (!Number.isSafeInteger(payout.totalAmount) || payout.totalAmount > 2147483647) {
      throw new Error('Claimed amount exceeds supported integer range');
    }
    const { data: account, error: accountError } = await supabase
      .from('mercadopago_accounts')
      .select('mercadopago_user_id, access_token')
      .eq('user_id', payout.lawyerId)
      .single()
    if (accountError || !account?.access_token || !account?.mercadopago_user_id) {
      throw new Error('Missing linked Mercado Pago account; manual review required');
    }

    requestedAmount = payout.totalAmount;
    const transfer = await createTransfer(payout, account.mercadopago_user_id)
    providerConfirmed = true;
    transferReference = String(transfer.id);

    const { data: completed, error: completionError } = await supabase
      .from('payments')
      .update({
        payout_status: 'completed',
        payout_date: new Date().toISOString(),
        payout_reference: transfer?.id ?? null,
        payout_error: null,
      })
      .in('id', payout.paymentIds)
      .eq('payout_status', 'processing')
      .select('id')
    if (completionError || completed?.length !== payout.paymentIds.length) {
      throw new Error('Provider succeeded but local completion failed; reconciliation required');
    }

    const { error: logError } = await supabase.from('payout_logs').insert({
      lawyer_user_id: payout.lawyerId,
      total_amount: payout.totalAmount,
      payment_ids: payout.paymentIds,
      status: 'completed',
      reference: transfer?.id ?? null,
      metadata: transfer ?? null,
    })

    if (logError) throw new Error('Provider succeeded but payout log failed; reconciliation required');
    return { lawyerId: payout.lawyerId, status: 'completed' } as const
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error procesando payout', payout.lawyerId, message)

    if (providerConfirmed) {
      // Never release or resend after external success, including a failed log write.
      return { lawyerId: payout.lawyerId, status: 'reconciliation_required', reason: message, reference: transferReference } as const;
    }
    await markPaymentsFailed(supabase, payout.paymentIds, message)
    await supabase.from('payout_logs').insert({
      lawyer_user_id: payout.lawyerId,
      total_amount: requestedAmount,
      payment_ids: payout.paymentIds,
      status: 'failed',
      error: message,
    })

    return { lawyerId: payout.lawyerId, status: 'failed', reason: message } as const
  }
}

async function markPaymentsFailed(supabase: SupabaseClient, paymentIds: string[], reason: string) {
  if (paymentIds.length === 0) return

  await supabase
    .from('payments')
    .update({ payout_status: 'error', payout_error: reason })
    .in('id', paymentIds)
}

async function createTransfer(payout: PayoutGroup, providerUserId: string | number) {
  const platformToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  if (!platformToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured')
  }

  // Destination is the provider account linked to the canonical lawyer identity.
  const payload = {
    amount: payout.totalAmount,
    currency_id: payout.currency || DEFAULT_CURRENCY,
    user_id: providerUserId,
    external_reference: `PAYOUT-${new Date().toISOString()}`,
    metadata: {
      payment_ids: payout.paymentIds,
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
    throw new Error(`MercadoPago transfer error (${response.status}); manual review required`)
  }

  const transfer = await response.json()
  if (!transfer?.id || (transfer.status && !['approved', 'completed', 'succeeded', 'success'].includes(transfer.status))) {
    throw new Error('Transfer not confirmed; manual reconciliation required');
  }
  return transfer
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
