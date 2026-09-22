import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { aiOperationIdentity } from '@/lib/aiOperationIdentity';
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); sessionStorage.clear(); });
describe('AI operation identity lifecycle', () => {
  it('network ambiguity/refresh keeps the same opaque key; no legal text in storage', async () => {
    const first = await aiOperationIdentity('lawyer/workspace/chat', { message: 'private fixture' });
    const retry = await aiOperationIdentity('lawyer/workspace/chat', { message: 'private fixture' });
    expect(retry.id).toBe(first.id);
    expect(Object.keys(sessionStorage).join()).not.toContain('private');
    const values = Object.keys(sessionStorage).map(key => sessionStorage.getItem(key)).join();
    expect(values).not.toContain('fixture');
    vi.resetModules();
    const { aiOperationIdentity: refreshed } = await import('@/lib/aiOperationIdentity');
    expect((await refreshed('lawyer/workspace/chat', { message: 'private fixture' })).id).toBe(first.id);
  });
  it('terminal success/failure releases identity; deliberate reanalysis is new intent', async () => {
    for (const status of ['succeeded', 'failed']) {
      const first = await aiOperationIdentity(`analysis:${status}`, { model: 'A' });
      first.complete({ ai_operation: { terminal: true } });
      expect((await aiOperationIdentity(`analysis:${status}`, { model: 'A' })).id).not.toBe(first.id);
    }
  });
  it('pending/malformed response preserves identity; user/model/document cannot leak', async () => {
    const first = await aiOperationIdentity('A/document1', { model: 'A' });
    first.complete({});
    expect((await aiOperationIdentity('A/document1', { model: 'A' })).id).toBe(first.id);
    for (const [scope, model] of [['B/document1', 'A'], ['A/document2', 'A'], ['A/document1', 'B']]) {
      expect((await aiOperationIdentity(scope, { model })).id).not.toBe(first.id);
    }
  });
  it('concurrent duplicate initiation shares one key', async () => {
    const [a,b] = await Promise.all([aiOperationIdentity('concurrent', {}), aiOperationIdentity('concurrent', {})]);
    expect(a.id).toBe(b.id);
  });
});
