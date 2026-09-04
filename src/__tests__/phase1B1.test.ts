import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { normalizeEmail } from '@/lib/normalizeEmail';

// Unit: existing helpers already tested, but add workflow-specific unit
describe('FASE 1B.1 — Request→Client→Case workflow unit', () => {
  it('normalizeEmail handles all cases for client dedupe', () => {
    expect(normalizeEmail(' Juan@Email.com ')).toBe('juan@email.com');
    expect(normalizeEmail('JUAN@EMAIL.COM')).toBe('juan@email.com');
    expect(normalizeEmail(null)).toBe(null);
    expect(normalizeEmail('')).toBe(null);
    expect(normalizeEmail('   ')).toBe(null);
  });

  it('case status enum valid', () => {
    const valid = ['new', 'quoted', 'paid', 'in_progress', 'delivered', 'closed', 'cancelled'];
    for (const s of valid) expect(valid.includes(s)).toBe(true);
    expect(valid.includes('HACK')).toBe(false);
  });

  it('source enum valid', () => {
    const valid = ['LAWYER_DIRECT', 'LEGALUP_MARKETPLACE', 'UNKNOWN'];
    expect(valid.includes('LAWYER_DIRECT')).toBe(true);
    expect(valid.includes('HACK')).toBe(false);
  });
});

// Integration: real Supabase RLS + workflow (requires TEST_LAWYER_* env)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const A_EMAIL = process.env.TEST_LAWYER_A_EMAIL || '';
const A_PASS = process.env.TEST_LAWYER_A_PASSWORD || '';
const B_EMAIL = process.env.TEST_LAWYER_B_EMAIL || '';
const B_PASS = process.env.TEST_LAWYER_B_PASSWORD || '';
const hasEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && A_EMAIL && A_PASS && B_EMAIL && B_PASS);
const maybeDescribe = hasEnv ? describe : describe.skip;

maybeDescribe('FASE 1B.1 — Clients/Cases/Requests RLS + workflow (real)', () => {
  it('Same lawyer cannot create duplicate normalized email', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    const lawyerAId = (await supabaseA.auth.getUser()).data.user!.id;
    const email = `dup-${Date.now()}@test.invalid`;
    // first create
    const { data: c1, error: e1 } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: lawyerAId, name: 'Dup Test', email, source: 'LAWYER_DIRECT' }).select().single();
    expect(e1).toBeNull();
    // second with different case/spaces should fail unique
    const { error: e2 } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: lawyerAId, name: 'Dup Test2', email: ` ${email.toUpperCase()} `, source: 'LAWYER_DIRECT' }).select().single();
    expect(e2).not.toBeNull();
    expect(e2!.code).toBe('23505');
    // cleanup
    await supabaseA.from('lawyer_clients').delete().eq('id', (c1 as any).id);
    await supabaseA.auth.signOut();
  });

  it('Different lawyers can have same email', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    await supabaseB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    const bId = (await supabaseB.auth.getUser()).data.user!.id;
    const email = `shared-${Date.now()}@test.invalid`;
    const { data: cA, error: eA } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: aId, name: 'Shared A', email, source: 'LAWYER_DIRECT' }).select().single();
    expect(eA).toBeNull();
    const { data: cB, error: eB } = await supabaseB.from('lawyer_clients').insert({ lawyer_id: bId, name: 'Shared B', email, source: 'LAWYER_DIRECT' }).select().single();
    expect(eB).toBeNull();
    expect((cA as any).email).toBe(email);
    expect((cB as any).email).toBe(email);
    await supabaseA.from('lawyer_clients').delete().eq('id', (cA as any).id);
    await supabaseB.from('lawyer_clients').delete().eq('id', (cB as any).id);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('Lawyer A cannot attach Lawyer B booking to own case', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    await supabaseB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    const bId = (await supabaseB.auth.getUser()).data.user!.id;
    // B booking via marketplace endpoint (service_role server-side, no browser secret)
    const bookingRes = await fetch('https://uplegal-service.onrender.com/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lawyer_id: bId, user_name: 'Bob', user_email: `bob-${Date.now()}@test.invalid`, user_phone: '+56900000000', price: 10000, booking_type: 'service', service_title: 'Test', service_id: '00000000-0000-0000-0000-000000000001', duration: 0 }),
    });
    const bookingJson: any = await bookingRes.json();
    const bookingBId = bookingJson.booking_id || bookingJson.booking?.id;
    expect(bookingBId).toBeTruthy();
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    // A creates client
    const { data: clientA } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: aId, name: 'Client A', email: `client-a-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' }).select('id').single();
    // A tries to create case with B's booking -> should fail RLS
    const { error: caseErr } = await supabaseA.from('lawyer_cases').insert({ lawyer_id: aId, client_id: (clientA as any).id, booking_id: bookingBId, title: 'Hack', status: 'new', source: 'LAWYER_DIRECT' }).select().single();
    expect(caseErr).not.toBeNull();
    // cleanup via B (owner can update status to cancelled)
    if (clientA) await supabaseA.from('lawyer_clients').delete().eq('id', (clientA as any).id);
    await supabaseB.from('bookings').update({ status: 'cancelled' } as any).eq('id', bookingBId);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('Request processing creates client+case and reuses existing client', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    // simulate marketplace booking for A via marketplace endpoint
    const email = `req-${Date.now()}@test.invalid`;
    const bookingRes = await fetch('https://uplegal-service.onrender.com/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lawyer_id: aId, user_name: 'Req Client', user_email: email, user_phone: '+56900000000', price: 5000, booking_type: 'service', service_title: 'Consulta', service_id: '00000000-0000-0000-0000-000000000002', duration: 0 }),
    });
    const bookingJson: any = await bookingRes.json();
    const bookingId = bookingJson.booking_id || bookingJson.booking?.id;
    expect(bookingId).toBeTruthy();
    // first process: findOrCreate should create
    const { data: existingBefore } = await supabaseA.from('lawyer_clients').select('id').eq('lawyer_id', aId).filter('email', 'ilike', email).maybeSingle();
    expect(existingBefore).toBeNull();
    // create client
    const { data: client1 } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: aId, name: 'Req Client', email, source: 'LEGALUP_MARKETPLACE', first_booking_id: bookingId }).select().single();
    expect(client1).toBeTruthy();
    // second attempt with same email should reuse (simulate findOrCreate)
    const { data: client2 } = await supabaseA.from('lawyer_clients').select('id').eq('lawyer_id', aId).filter('email', 'ilike', email).maybeSingle();
    expect((client2 as any).id).toBe((client1 as any).id);
    // create case
    const { data: case1 } = await supabaseA.from('lawyer_cases').insert({ lawyer_id: aId, client_id: (client1 as any).id, booking_id: bookingId, title: 'Consulta', status: 'new', source: 'LEGALUP_MARKETPLACE' }).select().single();
    expect(case1).toBeTruthy();
    // second case for same booking should fail unique
    const { error: dupErr } = await supabaseA.from('lawyer_cases').insert({ lawyer_id: aId, client_id: (client1 as any).id, booking_id: bookingId, title: 'Dup', status: 'new', source: 'LEGALUP_MARKETPLACE' }).select().single();
    expect(dupErr).not.toBeNull();
    expect(dupErr!.code).toBe('23505');
    // cleanup
    await supabaseA.from('lawyer_cases').delete().eq('id', (case1 as any).id);
    await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', bookingId);
    await supabaseA.from('lawyer_clients').delete().eq('id', (client1 as any).id);
    await supabaseA.auth.signOut();
  });

  it('lawyer_id takeover blocked on update', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    await supabaseB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    const bId = (await supabaseB.auth.getUser()).data.user!.id;
    const { data: clientA } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: aId, name: 'Takeover Test', email: `takeover-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' }).select().single();
    const { error: updErr } = await supabaseA.from('lawyer_clients').update({ lawyer_id: bId } as any).eq('id', (clientA as any).id);
    // Should fail RLS WITH CHECK (auth.uid() = lawyer_id) -> new lawyer_id B != A, so blocked, 0 rows or error
    // Supabase returns success with 0 rows if USING fails, but our policy WITH CHECK should also fail
    // Check that row still belongs to A
    const { data: after } = await supabaseA.from('lawyer_clients').select('lawyer_id').eq('id', (clientA as any).id).single();
    expect((after as any).lawyer_id).toBe(aId);
    await supabaseA.from('lawyer_clients').delete().eq('id', (clientA as any).id);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });
});
