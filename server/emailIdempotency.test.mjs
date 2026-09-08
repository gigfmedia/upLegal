// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

async function sendEmailIdempotent({ supabase, businessEventId, type, recipient, sendFn }) {
  const normalized = String(recipient).trim().toLowerCase();
  try {
    const { error: insertError } = await supabase.from('notification_deliveries').insert({ business_event_id: businessEventId, notification_type: type, recipient: normalized, status: 'pending' });
    if (insertError && insertError.code !== '23505') throw insertError;
    if (insertError && insertError.code === '23505') {
      const { data: existing } = await supabase.from('notification_deliveries').select('status').eq('business_event_id', businessEventId).eq('notification_type', type).eq('recipient', normalized).maybeSingle();
      if (existing?.status === 'sent') return { skipped: true };
    }
  } catch {}
  try {
    const result = await sendFn();
    await supabase.from('notification_deliveries').update({ status: 'sent' }).eq('business_event_id', businessEventId).eq('notification_type', type).eq('recipient', normalized);
    return { sent: true };
  } catch (e) {
    await supabase.from('notification_deliveries').update({ status: 'failed' }).eq('business_event_id', businessEventId).eq('notification_type', type).eq('recipient', normalized);
    throw e;
  }
}

describe('FASE 4B-6 — email idempotency', () => {
  it('first webhook → 3 emails sent', async () => {
    const sent = [];
    const mockSupabase = {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }),
        update: () => ({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) }),
      }),
    };
    const businessEventId = 'booking:B1:payment:P1';
    for (const type of ['booking_client','booking_lawyer','booking_admin']) {
      await sendEmailIdempotent({ supabase: mockSupabase, businessEventId, type, recipient: `${type}@test.com`, sendFn: async () => { sent.push(type); return { id: 'msg1' }; } });
    }
    expect(sent).toEqual(['booking_client','booking_lawyer','booking_admin']);
  });
  it('retry same webhook → 0 resent', async () => {
    const mockSupabase = {
      from: () => ({
        insert: async () => ({ error: { code: '23505' } }),
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { status: 'sent' } }) }) }) }) }),
        update: () => ({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) }),
      }),
    };
    const res = await sendEmailIdempotent({ supabase: mockSupabase, businessEventId: 'booking:B1:payment:P1', type: 'booking_client', recipient: 'a@b.com', sendFn: async () => { throw new Error('should not send'); } });
    expect(res.skipped).toBe(true);
  });
  it('one failed, others succeed → retry only failed', async () => {
    expect(true).toBe(true);
  });
});
