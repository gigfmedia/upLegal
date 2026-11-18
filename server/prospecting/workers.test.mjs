// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createProspectingWorkers } from './workers.mjs';

function harness({ failRecovery = false } = {}) {
  let now = new Date('2026-11-04T12:00:00.000Z');
  const calls = { recover: [], reprocess: [], scrub: [], health: 0 };
  const ledger = {
    async recoverStale(args) {
      calls.recover.push(args);
      if (failRecovery) throw new Error('recovery_failed');
      return { recovered: 1 };
    },
    async reprocessProviderEvents(args) {
      calls.reprocess.push(args);
      return { processed: 2 };
    },
    async scrubPii(args) {
      calls.scrub.push(args);
      return { scrubbed: 1 };
    },
  };
  const repository = {
    async getOperationalHealth() {
      calls.health += 1;
      return { ledger_ready: true };
    },
  };
  const errors = [];
  const workers = createProspectingWorkers({
    ledger,
    repository,
    clock: () => now,
    logger: {
      info() {},
      warn() {},
      error(message, meta) { errors.push({ message, meta }); },
    },
  });
  return {
    workers,
    calls,
    errors,
    advance(ms) { now = new Date(now.getTime() + ms); },
  };
}

describe('prospecting workers', () => {
  it('recupera sin habilitar el ledger y reprocesa eventos', async () => {
    const { workers, calls } = harness();
    const result = await workers.run({ scrub: false });
    expect(result).toMatchObject({ recovered: { recovered: 1 }, reprocessed: { processed: 2 } });
    expect(calls.recover[0]).toMatchObject({ now: '2026-11-04T12:00:00.000Z', markReady: false });
    expect(calls.reprocess[0]).toMatchObject({ limit: 100, now: '2026-11-04T12:00:00.000Z' });
    expect(calls.scrub).toHaveLength(0);
  });

  it('ejecuta scrub como máximo una vez cada 24 horas', async () => {
    const { workers, calls, advance } = harness();
    await workers.run({ scrub: true });
    await workers.run({ scrub: true });
    expect(calls.scrub).toHaveLength(1);

    advance(24 * 60 * 60 * 1000);
    await workers.run({ scrub: true });
    expect(calls.scrub).toHaveLength(2);
  });

  it('un fallo de recovery no impide reprocesar ni romper el tick', async () => {
    const { workers, calls, errors } = harness({ failRecovery: true });
    const result = await workers.run();
    expect(result.recovered).toBe(null);
    expect(result.reprocessed).toEqual({ processed: 2 });
    expect(errors[0].message).toContain('worker recovery failed');
    expect(calls.reprocess).toHaveLength(1);
  });

  it('deduplica ejecuciones concurrentes en proceso', async () => {
    const { workers, calls } = harness();
    const [first, second] = await Promise.all([workers.run(), workers.run()]);
    expect(first).toBe(second);
    expect(calls.recover).toHaveLength(1);
  });

  it('expone el estado operacional del repositorio', async () => {
    const { workers, calls } = harness();
    await expect(workers.health()).resolves.toEqual({ ledger_ready: true });
    expect(calls.health).toBe(1);
  });
});
