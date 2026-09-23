import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  pollTerminalResult,
  AI_OPERATION_IN_PROGRESS,
  IN_PROGRESS_POLL_DELAYS_MS,
  inProgressExhaustedMessage,
} from '@/lib/aiInProgressPoll';

const ok = (body: unknown = {}) => ({ res: { ok: true }, body });
const err = (code: string) => ({ res: { ok: false }, body: { error: 'x', code } });

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.38C-C in-progress auto-poll (same identity replay)', () => {
  it('returns the first terminal success without waiting', async () => {
    const round = vi.fn(async () => ok({ message: 'done' }));
    const out = await pollTerminalResult(round, { delaysMs: [1] });
    expect(out.res.ok).toBe(true);
    expect(round).toHaveBeenCalledTimes(1);
  });

  it('polls through 409s and returns the terminal result (no duplicate action)', async () => {
    const round = vi
      .fn()
      .mockResolvedValueOnce(err(AI_OPERATION_IN_PROGRESS))
      .mockResolvedValueOnce(err(AI_OPERATION_IN_PROGRESS))
      .mockResolvedValueOnce(ok({ message: 'done' }));
    const out = await pollTerminalResult(round, { delaysMs: [1, 1, 1] });
    expect(out.res.ok).toBe(true);
    expect(round).toHaveBeenCalledTimes(3);
  });

  it('non-in-progress errors pass through immediately', async () => {
    const round = vi.fn(async () => err('PROVIDER_ERROR'));
    const out = await pollTerminalResult(round, { delaysMs: [1, 1] });
    expect(out.body.code).toBe('PROVIDER_ERROR');
    expect(round).toHaveBeenCalledTimes(1);
  });

  it('exhaustion returns the last 409 after bounded rounds', async () => {
    const round = vi.fn(async () => err(AI_OPERATION_IN_PROGRESS));
    const out = await pollTerminalResult(round, { delaysMs: [1, 1] });
    expect(out.body.code).toBe(AI_OPERATION_IN_PROGRESS);
    // 1 initial + 2 retries, then control returns to the UI.
    expect(round).toHaveBeenCalledTimes(3);
  });

  it('default delays bound total wait (~33s)', () => {
    expect(IN_PROGRESS_POLL_DELAYS_MS).toEqual([3000, 5000, 10000, 15000]);
  });

  it('abort during the wait rejects instead of firing another round', async () => {
    const controller = new AbortController();
    const round = vi.fn(async () => err(AI_OPERATION_IN_PROGRESS));
    const pending = pollTerminalResult(round, { signal: controller.signal, delaysMs: [5000] });
    await new Promise((r) => setTimeout(r, 5));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(round).toHaveBeenCalledTimes(1);
  });

  it('already-aborted signal never fires', async () => {
    const controller = new AbortController();
    controller.abort();
    const round = vi.fn(async () => err(AI_OPERATION_IN_PROGRESS));
    await expect(
      pollTerminalResult(round, { signal: controller.signal, delaysMs: [1] })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('exhausted copy promises no duplication', () => {
    expect(inProgressExhaustedMessage()).toMatch(/no se duplicar/i);
  });

  it('chat, research and analysis hooks poll with the same identity', () => {
    for (const p of ['src/hooks/useAIChat.ts', 'src/hooks/useAIResearch.ts', 'src/hooks/useAIDocuments.ts']) {
      const c = read(p);
      expect(c).toContain('pollTerminalResult');
      // Identity is resolved once per user action and reused across rounds.
      expect(c).toContain('aiOperationIdentity');
    }
    expect(read('src/components/legalup-ai/AIChat.tsx')).toContain('AI_OPERATION_IN_PROGRESS');
    expect(read('src/components/legalup-ai/AIResearchPanel.tsx')).toContain('AI_OPERATION_IN_PROGRESS');
    expect(read('src/components/legalup-ai/AICaseDocumentsWorkspace.tsx')).toContain('AI_OPERATION_IN_PROGRESS');
  });
});
