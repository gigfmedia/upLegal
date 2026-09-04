import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const A_EMAIL = process.env.TEST_LAWYER_A_EMAIL || '';
const A_PASS = process.env.TEST_LAWYER_A_PASSWORD || '';
const B_EMAIL = process.env.TEST_LAWYER_B_EMAIL || '';
const B_PASS = process.env.TEST_LAWYER_B_PASSWORD || '';
const hasEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && A_EMAIL && A_PASS && B_EMAIL && B_PASS);
const maybeDescribe = hasEnv ? describe : describe.skip;

maybeDescribe('FASE 1B.2 — Bookings RLS + Revenue + Dashboard', () => {
  it('A can create LAWYER_DIRECT booking for A', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    // create client first
    const email = `b1b2-${Date.now()}@test.invalid`;
    const { data: client } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: aId, name: 'B1B2 Client', email, source: 'LAWYER_DIRECT' }).select('id').single();
    expect(client).toBeTruthy();
    const { data: booking, error } = await supabaseA.from('bookings').insert({
      lawyer_id: aId,
      user_name: 'B1B2 Client',
      user_email: email,
      price: 0,
      booking_type: 'appointment',
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      scheduled_time: '10:00',
      duration: 30,
      status: 'confirmed',
      source: 'LAWYER_DIRECT',
      client_id: (client as any).id,
    } as any).select('id').single();
    expect(error).toBeNull();
    expect(booking).toBeTruthy();
    // cleanup
    if (booking) await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', (booking as any).id);
    if (client) await supabaseA.from('lawyer_clients').delete().eq('id', (client as any).id);
    await supabaseA.auth.signOut();
  });

  it('A cannot create booking for B (lawyer_id takeover)', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    await supabaseB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    const bId = (await supabaseB.auth.getUser()).data.user!.id;
    const { error } = await supabaseA.from('bookings').insert({
      lawyer_id: bId,
      user_name: 'Hack',
      user_email: `hack-${Date.now()}@test.invalid`,
      price: 0,
      booking_type: 'appointment',
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: '11:00',
      duration: 30,
      status: 'confirmed',
      source: 'LAWYER_DIRECT',
    } as any).select().single();
    expect(error).not.toBeNull();
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('A cannot attach B client to own booking', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    await supabaseB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    const bId = (await supabaseB.auth.getUser()).data.user!.id;
    const { data: clientB } = await supabaseB.from('lawyer_clients').insert({ lawyer_id: bId, name: 'B Client', email: `b-client-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' }).select('id').single();
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    const { error } = await supabaseA.from('bookings').insert({
      lawyer_id: aId,
      user_name: 'Test',
      user_email: `test-${Date.now()}@test.invalid`,
      price: 0,
      booking_type: 'appointment',
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: '12:00',
      duration: 30,
      status: 'confirmed',
      source: 'LAWYER_DIRECT',
      client_id: (clientB as any).id,
    } as any).select().single();
    expect(error).not.toBeNull();
    if (clientB) await supabaseB.from('lawyer_clients').delete().eq('id', (clientB as any).id);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('B cannot read A private SaaS booking', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    await supabaseB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    const { data: bookingA } = await supabaseA.from('bookings').insert({
      lawyer_id: aId,
      user_name: 'Private',
      user_email: `private-${Date.now()}@test.invalid`,
      price: 0,
      booking_type: 'appointment',
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: '13:00',
      duration: 30,
      status: 'confirmed',
      source: 'LAWYER_DIRECT',
    } as any).select('id').single();
    const { data: asB } = await supabaseB.from('bookings').select('id').eq('id', (bookingA as any).id);
    expect((asB || []).length).toBe(0);
    if (bookingA) await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', (bookingA as any).id);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('A cannot read B revenue (payments)', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    await supabaseB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    const bId = (await supabaseB.auth.getUser()).data.user!.id;
    // B's payments should not be visible to A (if any exist, they are filtered by RLS)
    // We test by trying to select payments where lawyer_id = B as A
    const { data: paymentsAsA } = await supabaseA.from('payments').select('id').eq('lawyer_id', bId).limit(1);
    expect((paymentsAsA || []).length).toBe(0);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('Public Marketplace booking still creates with source UNKNOWN', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    const res = await fetch('https://uplegal-service.onrender.com/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lawyer_id: aId, user_name: 'Marketplace Test', user_email: `market-${Date.now()}@test.invalid`, price: 10000, booking_type: 'service', service_title: 'Test', service_id: '00000000-0000-0000-0000-000000000001', duration: 0 }),
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    const bookingId = json.booking_id;
    expect(bookingId).toBeTruthy();
    // Verify via lawyer's own read (RLS allows own bookings)
    const { data: booking } = await supabaseA.from('bookings').select('source,client_id').eq('id', bookingId).single();
    expect((booking as any).source).toBe('UNKNOWN');
    expect((booking as any).client_id).toBeNull();
    await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', bookingId);
    await supabaseA.auth.signOut();
  });
});
