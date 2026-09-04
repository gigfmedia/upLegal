import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Fase 1A — RLS multi-tenant obligatorio
// Estos tests requieren SUPABASE_URL + ANON_KEY + 2 usuarios lawyer reales.
// Si no hay credenciales, se skipean (no bloquean CI local sin DB).
// En CI con secrets, deben pasar 100%.

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Usuarios de test deben existir en auth y tener profiles.role=lawyer
// Se pueden crear manualmente o via supabase.auth.signUp en setup
const LAWYER_A_EMAIL = process.env.TEST_LAWYER_A_EMAIL || '';
const LAWYER_A_PASSWORD = process.env.TEST_LAWYER_A_PASSWORD || '';
const LAWYER_B_EMAIL = process.env.TEST_LAWYER_B_EMAIL || '';
const LAWYER_B_PASSWORD = process.env.TEST_LAWYER_B_PASSWORD || '';

const hasRlsEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && LAWYER_A_EMAIL && LAWYER_A_PASSWORD && LAWYER_B_EMAIL && LAWYER_B_PASSWORD);

const maybeDescribe = hasRlsEnv ? describe : describe.skip;

maybeDescribe('RLS Fase 1A — lawyer_clients / lawyer_cases / bookings (real sessions)', () => {
  it('Lawyer A no puede SELECT client de Lawyer B', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);

    const { error: errA, data: dataA } = await supabaseA.auth.signInWithPassword({
      email: LAWYER_A_EMAIL,
      password: LAWYER_A_PASSWORD,
    });
    expect(errA).toBeNull();
    const lawyerAId = dataA.user!.id;

    const { error: errB } = await supabaseB.auth.signInWithPassword({
      email: LAWYER_B_EMAIL,
      password: LAWYER_B_PASSWORD,
    });
    expect(errB).toBeNull();

    // B crea un cliente
    const { data: clientB, error: insertErr } = await supabaseB
      .from('lawyer_clients')
      .insert({ lawyer_id: (await supabaseB.auth.getUser()).data.user!.id, name: 'Client B', email: `rls-b-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' })
      .select('id')
      .single();
    // Si tabla aún no existe en remote (migration no pushed), este test fallará con 404 — documentar como BLOCKER
    if (insertErr && insertErr.message.includes('Could not find the table')) {
      throw new Error(`BLOCKER: lawyer_clients table not found on remote — migration not pushed: ${insertErr.message}`);
    }
    expect(insertErr).toBeNull();
    expect(clientB).toBeTruthy();

    // A intenta leer todos sus clientes (debe ver 0 del B)
    const { data: clientsA, error: selectErr } = await supabaseA
      .from('lawyer_clients')
      .select('id, lawyer_id')
      .eq('lawyer_id', (await supabaseB.auth.getUser()).data.user!.id);

    // Con RLS, este SELECT debe devolver 0 filas (policy USING auth.uid()=lawyer_id filtra)
    expect(selectErr).toBeNull();
    expect(clientsA?.length ?? 0).toBe(0);

    // Cleanup: B borra su cliente
    await supabaseB.from('lawyer_clients').delete().eq('id', clientB!.id);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
    expect(lawyerAId).toBeTruthy();
  });

  it('Lawyer A no puede INSERT en tenant B (WITH CHECK)', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: LAWYER_A_EMAIL, password: LAWYER_A_PASSWORD });
    await supabaseB.auth.signInWithPassword({ email: LAWYER_B_EMAIL, password: LAWYER_B_PASSWORD });
    const lawyerBId = (await supabaseB.auth.getUser()).data.user!.id;

    const { error: insertErr } = await supabaseA
      .from('lawyer_clients')
      .insert({ lawyer_id: lawyerBId, name: 'Hack', email: `hack-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' });

    // Debe fallar por RLS WITH CHECK (auth.uid()=lawyer_id)
    expect(insertErr).not.toBeNull();
    expect(insertErr!.message.toLowerCase()).toMatch(/row-level security|policy|permission|violates/);

    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('Cross-tenant client en case debe fallar', async () => {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } } as any);
    await supabaseA.auth.signInWithPassword({ email: LAWYER_A_EMAIL, password: LAWYER_A_PASSWORD });
    await supabaseB.auth.signInWithPassword({ email: LAWYER_B_EMAIL, password: LAWYER_B_PASSWORD });

    const { data: clientB } = await supabaseB
      .from('lawyer_clients')
      .insert({ lawyer_id: (await supabaseB.auth.getUser()).data.user!.id, name: 'Client B2', email: `rls-b2-${Date.now()}@test.invalid`, source: 'LAWYER_DIRECT' })
      .select('id')
      .single();

    if (!clientB) {
      await supabaseA.auth.signOut();
      await supabaseB.auth.signOut();
      return;
    }

    const { error: caseErr } = await supabaseA
      .from('lawyer_cases')
      .insert({
        lawyer_id: (await supabaseA.auth.getUser()).data.user!.id,
        client_id: clientB.id,
        title: 'Hack case',
        status: 'new',
        source: 'LAWYER_DIRECT',
      });

    expect(caseErr).not.toBeNull();
    expect(caseErr!.message.toLowerCase()).toMatch(/policy|violates|row-level|foreign key|exists/);

    await supabaseB.from('lawyer_clients').delete().eq('id', clientB.id);
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  it('Anon no puede leer lawyer_clients', async () => {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await anon.from('lawyer_clients').select('id').limit(1);
    // Con RLS, anon sin auth.uid() debe ver 0 filas o error
    // Supabase anon puede SELECT pero policy USING (auth.uid()=lawyer_id) con auth.uid()=null => 0 filas
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0);
  });
});

describe('RLS Fase 1A — unit fallback (sin DB)', () => {
  it('skip message cuando no hay env de RLS real (no bloquea CI local)', () => {
    if (!hasRlsEnv) {
      expect(true).toBe(true); // placeholder para que el suite no falle sin secrets
    } else {
      expect(hasRlsEnv).toBe(true);
    }
  });
});
