// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { QUALITY_RULES_VERSION, isQualityEligible } from './quality.mjs';
import { createProspectingRepository } from './repository.mjs';

function matchesFilters(row, filters) {
  return filters.every(([key, op, value]) => {
    if (op === 'eq') return row[key] === value;
    if (op === 'in') return value.includes(row[key]);
    if (op === 'is') return (row[key] ?? null) === value;
    if (op === 'lt') return row[key] < value;
    if (op === 'not' && value === null) return row[key] !== null && row[key] !== undefined;
    return true;
  });
}

function createFakeSupabase({ prospects = [], sends = [], suppressions = [], profiles = [], runs = [], settings = [], ignoreFilters = false } = {}) {
  const state = { prospectFilters: [], upserts: [], inserts: [], updates: [] };

  function from(table) {
    let filters = [];
    let range = null;
    let limit = null;
    let upsertPayload = null;
    let upsertOptions = null;
    let insertPayload = null;
    let updatePayload = null;
    let singleMode = false;

    function resolveQuery() {
      if (upsertPayload) {
        state.upserts.push({ table, payload: upsertPayload, options: upsertOptions });
        return {
          data: upsertPayload.map((row, index) => ({ ...row, id: `inserted-${index + 1}` })),
          error: null,
        };
      }
      if (insertPayload) {
        state.inserts.push({ table, payload: insertPayload });
        return { data: { ...insertPayload, id: 'inserted-manual' }, error: null };
      }

      let rows = [];
      if (table === 'prospects') rows = prospects;
      if (table === 'prospecting_sends') rows = sends;
      if (table === 'prospecting_suppressions') rows = suppressions;
      if (table === 'profiles') rows = profiles;
      if (table === 'prospecting_runs') rows = runs;
      if (table === 'prospecting_settings') rows = settings;

      if (table === 'prospects' && state.prospectFilters.length === 0) state.prospectFilters = filters;
      if (!ignoreFilters) rows = rows.filter((row) => matchesFilters(row, filters));
      if (range) rows = rows.slice(range.from, range.to + 1);
      if (limit) rows = rows.slice(0, limit);
      if (updatePayload) {
        for (const row of rows) Object.assign(row, updatePayload);
        state.updates.push({ table, ids: rows.map((row) => row.id), payload: updatePayload });
      }
      const data = rows.map((row) => ({ ...row }));
      return { data: singleMode ? data[0] || null : data, error: null };
    }

    const query = {
      select() { return query; },
      eq(key, value) { filters = [...filters, [key, 'eq', value]]; return query; },
      in(key, values) { filters = [...filters, [key, 'in', values]]; return query; },
      lt(key, value) { filters = [...filters, [key, 'lt', value]]; return query; },
      not(key, op, value) { filters = [...filters, [key, 'not', value]]; return query; },
      is(key, value) { filters = [...filters, [key, 'is', value]]; return query; },
      order() { return query; },
      limit(value) { limit = value; return query; },
      range(from, to) { range = { from, to }; return query; },
      upsert(payload, options) {
        upsertPayload = payload;
        upsertOptions = options;
        return query;
      },
      insert(payload) {
        insertPayload = payload;
        return query;
      },
      update(payload) {
        updatePayload = payload;
        return query;
      },
      single() { singleMode = true; return query; },
      maybeSingle() { singleMode = true; return query; },
      then(onFulfilled, onRejected) {
        return Promise.resolve(resolveQuery()).then(onFulfilled, onRejected);
      },
    };
    return query;
  }

  return {
    state,
    from,
  };
}

function baseProspect(overrides = {}) {
  return {
    quality_evaluated_at: '2026-11-06T12:00:00.000Z',
    quality_rules_version: QUALITY_RULES_VERSION,
    org_type: 'law_firm',
    email_kind: 'personal',
    validation_status: 'valid',
    status: 'validated',
    send_status: 'not_sent',
    rejection_reason: null,
    email: 'persona@estudio-alfa.example',
    ...overrides,
  };
}

function repositoryFor(fake, ledger = null) {
  return createProspectingRepository({
    supabase: fake,
    logger: { error() {}, warn() {} },
    ...(ledger ? { ledger } : {}),
  });
}

describe('prospecting repository eligibility', () => {
  it('filtra en SQL y en memoria por evaluación y calidad actual', async () => {
    const fake = createFakeSupabase({
      ignoreFilters: true,
      prospects: [
        baseProspect({ id: 'historico-sin-evaluar', quality_evaluated_at: null }),
        baseProspect({ id: 'calidad-fallida', org_type: 'portal' }),
        baseProspect({ id: 'reglas-antiguas', quality_rules_version: '2026-01-01.1' }),
        baseProspect({ id: 'elegible' }),
      ],
    });
    const repository = repositoryFor(fake);

    const eligible = await repository.listEligibleForRun('run-1', { limit: 10 });

    expect(eligible.map((row) => row.id)).toEqual(['elegible']);
    expect(fake.state.prospectFilters).toEqual(expect.arrayContaining([
      ['quality_rules_version', 'eq', QUALITY_RULES_VERSION],
      ['org_type', 'eq', 'law_firm'],
      ['email_kind', 'eq', 'personal'],
      ['quality_evaluated_at', 'not', null],
      ['rejection_reason', 'is', null],
    ]));
  });

  it('no selecciona prospectos registrados por email o sitio', async () => {
    const fake = createFakeSupabase({
      prospects: [
        baseProspect({ id: 'registrado-email', email: 'uno@estudio-uno.example', domain_key: 'estudio-uno.example' }),
        baseProspect({ id: 'registrado-sitio', email: 'dos@estudio-dos.example', website: 'https://www.estudio-dos.example', domain_key: 'estudio-dos.example' }),
        baseProspect({ id: 'elegible', email: 'tres@estudio-tres.example', website: 'https://estudio-tres.example', domain_key: 'estudio-tres.example' }),
      ],
      profiles: [
        { email: 'UNO@estudio-uno.example', website: null },
        { email: 'admin@estudio-dos.example', website: 'https://www.estudio-dos.example' },
      ],
    });
    const repository = repositoryFor(fake);

    const eligible = await repository.listEligibleForRun('run-1', { limit: 10 });

    expect(eligible.map((row) => row.id)).toEqual(['elegible']);
  });

  it('no consume cupo con históricos sin evaluar y respeta daily_target', async () => {
    const fake = createFakeSupabase({
      ignoreFilters: true,
      prospects: [
        baseProspect({ id: 'historico-sin-evaluar', quality_evaluated_at: null }),
        baseProspect({ id: 'elegible-1', email: 'uno@estudio-uno.example', domain_key: 'estudio-uno.example', person_key: 'uno' }),
        baseProspect({ id: 'elegible-2', email: 'dos@estudio-dos.example', domain_key: 'estudio-dos.example', person_key: 'dos' }),
      ],
    });
    const repository = repositoryFor(fake);

    const eligible = await repository.listEligibleForRun('run-1', { limit: 1 });

    expect(eligible.map((row) => row.id)).toEqual(['elegible-1']);
  });

  it('excluye dominios ya contactados en ejecuciones anteriores', async () => {
    const sends = [];
    const fake = createFakeSupabase({
      prospects: [
        baseProspect({ id: 'alfa-1', email: 'uno@estudio-alfa.example', website: 'https://estudio-alfa.example', domain_key: 'estudio-alfa.example', person_key: 'uno' }),
        baseProspect({ id: 'alfa-2', email: 'dos@estudio-alfa.example', website: 'https://estudio-alfa.example', domain_key: 'estudio-alfa.example', person_key: 'dos' }),
        baseProspect({ id: 'beta-1', email: 'tres@estudio-beta.example', website: 'https://estudio-beta.example', domain_key: 'estudio-beta.example', person_key: 'tres' }),
      ],
      sends,
    });
    const repository = repositoryFor(fake);

    const first = await repository.listEligibleForRun('run-1', { limit: 1 });
    expect(first.map((row) => row.id)).toEqual(['alfa-1']);

    sends.push({ prospect_id: 'alfa-1', status: 'sent' });
    const second = await repository.listEligibleForRun('run-2', { limit: 10 });

    expect(second.map((row) => row.id)).toEqual(['beta-1']);
  });

  it.each(['queued', 'sending'])('bloquea temporalmente el dominio con envío %s', async (status) => {
    const fake = createFakeSupabase({
      prospects: [
        baseProspect({ id: 'alfa-1', email: 'uno@estudio-alfa.example', website: 'https://estudio-alfa.example', domain_key: 'estudio-alfa.example', person_key: 'uno' }),
        baseProspect({ id: 'alfa-2', email: 'dos@estudio-alfa.example', website: 'https://estudio-alfa.example', domain_key: 'estudio-alfa.example', person_key: 'dos' }),
        baseProspect({ id: 'beta-1', email: 'tres@estudio-beta.example', website: 'https://estudio-beta.example', domain_key: 'estudio-beta.example', person_key: 'tres' }),
      ],
      sends: [{ prospect_id: 'alfa-1', status }],
    });
    const repository = repositoryFor(fake);

    const eligible = await repository.listEligibleForRun('run-2', { limit: 10 });

    expect(eligible.map((row) => row.id)).toEqual(['beta-1']);
  });

  it('no bloquea el dominio por un envío failed', async () => {
    const fake = createFakeSupabase({
      prospects: [
        baseProspect({ id: 'alfa-1', email: 'uno@estudio-alfa.example', website: 'https://estudio-alfa.example', domain_key: 'estudio-alfa.example', person_key: 'uno' }),
        baseProspect({ id: 'alfa-2', email: 'dos@estudio-alfa.example', website: 'https://estudio-alfa.example', domain_key: 'estudio-alfa.example', person_key: 'dos' }),
        baseProspect({ id: 'beta-1', email: 'tres@estudio-beta.example', website: 'https://estudio-beta.example', domain_key: 'estudio-beta.example', person_key: 'tres' }),
      ],
      sends: [{ prospect_id: 'alfa-1', status: 'failed' }],
    });
    const repository = repositoryFor(fake);

    const eligible = await repository.listEligibleForRun('run-2', { limit: 10 });

    expect(eligible.map((row) => row.id)).toEqual(['alfa-2', 'beta-1']);
  });

  it.each(['sent', 'sending'])('permite contactos del mismo dominio si el setting lo autoriza (%s)', async (status) => {
    const fake = createFakeSupabase({
      prospects: [
        baseProspect({ id: 'alfa-1', email: 'uno@estudio-alfa.example', website: 'https://estudio-alfa.example', domain_key: 'estudio-alfa.example', person_key: 'uno' }),
        baseProspect({ id: 'alfa-2', email: 'dos@estudio-alfa.example', website: 'https://estudio-alfa.example', domain_key: 'estudio-alfa.example', person_key: 'dos' }),
        baseProspect({ id: 'beta-1', email: 'tres@estudio-beta.example', website: 'https://estudio-beta.example', domain_key: 'estudio-beta.example', person_key: 'tres' }),
      ],
      sends: [{ prospect_id: 'alfa-1', status }],
    });
    const repository = repositoryFor(fake);

    const eligible = await repository.listEligibleForRun('run-2', {
      limit: 10,
      allowMultipleContactsPerFirm: true,
    });

    expect(eligible.map((row) => row.id)).toEqual(['alfa-2', 'beta-1']);
  });

  it('reevalúa y estampa la versión al insertar candidatos nuevos', async () => {
    const fake = createFakeSupabase();
    const repository = repositoryFor(fake);
    const staleEvaluatedAt = '1999-01-01T00:00:00.000Z';

    await repository.filterNewCandidates([{
      dedupe_key: 'email:persona@estudio-alfa.example',
      email: 'persona@estudio-alfa.example',
      contact_name: 'Persona Alfa',
      firm_name: 'Estudio Alfa & Asociados',
      website: 'https://estudio-alfa.example',
      description: 'Abogados laboralistas',
      source_url: 'https://estudio-alfa.example/equipo',
      validation_status: 'valid',
      status: 'validated',
      quality_evaluated_at: staleEvaluatedAt,
      quality_rules_version: 'reglas-obsoletas',
    }], { runId: 'run-1' });

    expect(fake.state.upserts).toHaveLength(1);
    const payload = fake.state.upserts[0].payload[0];
    expect(payload).toMatchObject({
      quality_rules_version: QUALITY_RULES_VERSION,
      quality_evaluated_at: expect.any(String),
      org_type: 'law_firm',
      email_kind: 'personal',
      status: 'validated',
      validation_status: 'valid',
    });
    expect(payload.quality_rules_version).not.toBe('reglas-obsoletas');
    expect(payload.quality_evaluated_at).not.toBe(staleEvaluatedAt);
  });

  it('persiste el contacto saneado y la firma visible al insertar', async () => {
    const fake = createFakeSupabase();
    const repository = repositoryFor(fake);

    await repository.filterNewCandidates([{
      dedupe_key: 'email:persona@claro.example',
      email: 'persona@claro.example',
      contact_name: 'Áreas de práctica',
      firm_name: 'Abogados',
      website: 'https://claro.example',
      description: 'Abogados',
      source_url: 'https://claro.example/abogados/',
      sourceTitle: 'Abogados – Claro y Cia.',
      validation_status: 'valid',
      status: 'validated',
    }], { runId: 'run-1' });

    const payload = fake.state.upserts[0].payload[0];
    expect(payload).toMatchObject({
      contact_name: null,
      firm_name: 'Claro y Cia.',
      org_type: 'law_firm',
      email_kind: 'personal',
    });
  });

  it('evalúa y permite elegible un prospecto manual suficiente', async () => {
    const fake = createFakeSupabase();
    const repository = repositoryFor(fake);

    const inserted = await repository.insertManualProspect({
      email: 'persona@estudio-alfa.example',
      contact_name: 'Persona Alfa',
      firm_name: 'Estudio Alfa & Asociados',
      website: 'https://estudio-alfa.example',
      description: 'Abogados laboralistas',
      source_url: 'https://estudio-alfa.example/equipo',
      status: 'validated',
      validation_status: 'valid',
    });

    expect(inserted).toMatchObject({
      quality_rules_version: QUALITY_RULES_VERSION,
      quality_evaluated_at: expect.any(String),
      org_type: 'law_firm',
      email_kind: 'personal',
      status: 'validated',
      validation_status: 'valid',
      rejection_reason: null,
    });
    expect(isQualityEligible({ ...inserted, send_status: 'not_sent' })).toBe(true);
  });


  it('delega la recuperación al ledger atómico sin escribir sends directamente', async () => {
    const fake = createFakeSupabase();
    const calls = [];
    const ledger = {
      async recoverStale(args) {
        calls.push(args);
        return { recovered: 2, runs: 1 };
      },
    };
    const repository = repositoryFor(fake, ledger);

    const result = await repository.recoverStaleRuns();

    expect(result).toEqual({ recovered: 1, runs: 1 });
    expect(calls[0]).toMatchObject({ markReady: false });
    expect(calls[0].now).toEqual(expect.any(String));
  });

  it('deja en revisión manual no terminal un prospecto manual con correo corrupto', async () => {
    const fake = createFakeSupabase();
    const repository = repositoryFor(fake);

    const inserted = await repository.insertManualProspect({
      email: 'larrondesocioejemplo@estudio-kappa.example',
      contact_name: null,
      firm_name: 'Estudio Kappa Abogados',
      website: 'https://estudio-kappa.example',
      description: 'Abogados penalistas',
      source_url: 'https://estudio-kappa.example/',
      status: 'validated',
      validation_status: 'valid',
      quality_rules_version: QUALITY_RULES_VERSION,
      quality_evaluated_at: '2026-01-01T00:00:00.000Z',
    });

    expect(inserted).toMatchObject({
      quality_rules_version: null,
      quality_evaluated_at: null,
      status: 'validated',
      validation_status: 'pending',
      rejection_reason: 'manual_review:email_corrupted_local_part',
    });
    expect(isQualityEligible({ ...inserted, send_status: 'not_sent' })).toBe(false);
  });

  it('deja sin versión y no elegible un prospecto manual sin correo', async () => {
    const fake = createFakeSupabase();
    const repository = repositoryFor(fake);

    const inserted = await repository.insertManualProspect({
      email: null,
      firm_name: 'Estudio Lambda Abogados',
      website: 'https://estudio-lambda.example',
      description: 'Defensa penal',
      source_url: 'https://estudio-lambda.example/',
      status: 'validated',
      validation_status: 'valid',
    });

    expect(inserted).toMatchObject({
      quality_rules_version: null,
      quality_evaluated_at: null,
      status: 'pending_contact',
      validation_status: 'pending',
      rejection_reason: 'manual_review:no_email',
    });
    expect(isQualityEligible({ ...inserted, send_status: 'not_sent' })).toBe(false);
  });
});
