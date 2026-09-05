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

maybeDescribe('FASE 1C — Case 1:N Bookings + RLS', () => {
  it('Test 1: Un caso puede tener múltiples bookings (1:N via bookings.case_id)', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    // create client
    const email = `1c-${Date.now()}@test.invalid`;
    const { data: client } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: aId, name: '1C Client', email, source: 'LAWYER_DIRECT' }).select('id').single();
    expect(client).toBeTruthy();
    // create case
    const { data: caso } = await supabaseA.from('lawyer_cases').insert({ lawyer_id: aId, client_id: (client as any).id, title: 'Caso 1C', status: 'new', source: 'LAWYER_DIRECT' }).select('id').single();
    expect(caso).toBeTruthy();
    const caseId = (caso as any).id;
    // create 3 bookings with case_id
    const bookings = [];
    for (let i = 0; i < 3; i++) {
      const { data, error } = await supabaseA.from('bookings').insert({
        lawyer_id: aId,
        user_name: '1C Client',
        user_email: email,
        price: 0,
        booking_type: 'appointment',
        scheduled_date: new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10),
        scheduled_time: `10:0${i}`,
        duration: 30,
        status: 'confirmed',
        source: 'LAWYER_DIRECT',
        client_id: (client as any).id,
        case_id: caseId,
      } as any).select('id').single();
      expect(error).toBeNull();
      bookings.push(data);
    }
    // verify 3 bookings have case_id
    const { data: fetched } = await supabaseA.from('bookings').select('id').eq('case_id', caseId).eq('lawyer_id', aId);
    expect((fetched || []).length).toBe(3);
    // cleanup
    for (const b of bookings) await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', (b as any).id);
    await supabaseA.from('lawyer_cases').delete().eq('id', caseId);
    await supabaseA.from('lawyer_clients').delete().eq('id', (client as any).id);
    await supabaseA.auth.signOut();
  });

  it('Test 2: Lawyer A no puede asignar booking A -> case B (cross-tenant)', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    await supabaseB.auth.signInWithPassword({ email: B_EMAIL, password: B_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    const bId = (await supabaseB.auth.getUser()).data.user!.id;
    // A creates client and case and booking
    const { data: clientA } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: aId, name: 'A Client', email: `a-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' }).select('id').single();
    const { data: caseA } = await supabaseA.from('lawyer_cases').insert({ lawyer_id: aId, client_id: (clientA as any).id, title: 'Case A', status: 'new', source: 'LAWYER_DIRECT' }).select('id').single();
    const { data: bookingA } = await supabaseA.from('bookings').insert({
      lawyer_id: aId,
      user_name: 'A',
      user_email: `a-${Date.now()}@test.invalid`,
      price: 0,
      booking_type: 'appointment',
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: '11:00',
      duration: 30,
      status: 'confirmed',
      source: 'LAWYER_DIRECT',
      client_id: (clientA as any).id,
      case_id: (caseA as any).id,
    } as any).select('id').single();
    // B creates case
    const { data: clientB } = await supabaseB.from('lawyer_clients').insert({ lawyer_id: bId, name: 'B Client', email: `b-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' }).select('id').single();
    const { data: caseB } = await supabaseB.from('lawyer_cases').insert({ lawyer_id: bId, client_id: (clientB as any).id, title: 'Case B', status: 'new', source: 'LAWYER_DIRECT' }).select('id').single();
    // A tries to update own booking to point to B's case -> should fail RLS
    const { error } = await supabaseA.from('bookings').update({ case_id: (caseB as any).id } as any).eq('id', (bookingA as any).id);
    expect(error).not.toBeNull();
    // cleanup
    await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', (bookingA as any).id);
    await supabaseA.from('lawyer_cases').delete().eq('id', (caseA as any).id);
    await supabaseA.from('lawyer_clients').delete().eq('id', (clientA as any).id);
    await supabaseB.from('lawyer_cases').delete().eq('id', (caseB as any).id);
    await supabaseB.from('lawyer_clients').delete().eq('id', (clientB as any).id);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('Test 4 & 5: A can create LAWYER_DIRECT with case_id and with null case_id', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    const { data: client } = await supabaseA.from('lawyer_clients').insert({ lawyer_id: aId, name: 'Test Client', email: `test-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' }).select('id').single();
    const { data: caso } = await supabaseA.from('lawyer_cases').insert({ lawyer_id: aId, client_id: (client as any).id, title: 'Test Case', status: 'new', source: 'LAWYER_DIRECT' }).select('id').single();
    // with case_id
    const { data: b1, error: e1 } = await supabaseA.from('bookings').insert({
      lawyer_id: aId,
      user_name: 'Test',
      user_email: `test-${Date.now()}@test.invalid`,
      price: 0,
      booking_type: 'appointment',
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: '14:00',
      duration: 30,
      status: 'confirmed',
      source: 'LAWYER_DIRECT',
      client_id: (client as any).id,
      case_id: (caso as any).id,
    } as any).select('id').single();
    expect(e1).toBeNull();
    expect(b1).toBeTruthy();
    // with null case_id
    const { data: b2, error: e2 } = await supabaseA.from('bookings').insert({
      lawyer_id: aId,
      user_name: 'Test2',
      user_email: `test2-${Date.now()}@test.invalid`,
      price: 0,
      booking_type: 'appointment',
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: '15:00',
      duration: 30,
      status: 'confirmed',
      source: 'LAWYER_DIRECT',
      client_id: (client as any).id,
      case_id: null,
    } as any).select('id').single();
    expect(e2).toBeNull();
    expect(b2).toBeTruthy();
    // cleanup
    if (b1) await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', (b1 as any).id);
    if (b2) await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', (b2 as any).id);
    await supabaseA.from('lawyer_cases').delete().eq('id', (caso as any).id);
    await supabaseA.from('lawyer_clients').delete().eq('id', (client as any).id);
    await supabaseA.auth.signOut();
  });

  it('Test 7: Marketplace still creates source UNKNOWN', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    const aId = (await supabaseA.auth.getUser()).data.user!.id;
    await supabaseA.auth.signOut();
    const res = await fetch('https://uplegal-service.onrender.com/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lawyer_id: aId, user_name: 'Market Test', user_email: `market-${Date.now()}@test.invalid`, price: 10000, booking_type: 'service', service_title: 'Test', service_id: '00000000-0000-0000-0000-000000000001', duration: 0 }),
    });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    const bookingId = json.booking_id;
    expect(bookingId).toBeTruthy();
    // verify via lawyer read
    await supabaseA.auth.signInWithPassword({ email: A_EMAIL, password: A_PASS });
    const { data: booking } = await supabaseA.from('bookings').select('source,client_id').eq('id', bookingId).single();
    expect((booking as any).source).toBe('UNKNOWN');
    expect((booking as any).client_id).toBeNull();
    await supabaseA.from('bookings').update({ status: 'cancelled' } as any).eq('id', bookingId);
    await supabaseA.auth.signOut();
  });
});
