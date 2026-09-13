// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const paths = ['/api/ai/trial/start', '/api/ai/subscribe'];
function harness({ pro = false, subscription = null, user = 'lawyer' } = {}) {
  const handlers = {};
  const write = vi.fn(() => { throw new Error('Acquisition must not write'); });
  const provider = vi.fn(() => { throw new Error('Acquisition must not call provider'); });
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { role: 'lawyer' } }), insert: write, update: write };
  const ctx = vm.createContext({
    app: { post: (path, handler) => { handlers[path] = handler; } },
    requireAILawyer: async (_req, res) => { if (!user) res.status(401).json({ code: 'UNAUTHORIZED' }); return user; },
    getAILawyerEmail: async () => ({ email_confirmed_at: '2020-01-01' }),
    getProLawyerAccess: async () => ({ hasAccess: pro }),
    getAILawyerSubscription: async () => subscription,
    supabase: { from: () => query }, fetch: provider, console,
  });
  for (const node of ast.statements) {
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && paths.includes(node.expression.arguments[0]?.text)) vm.runInContext(node.getText(ast), ctx);
  }
  return { write, provider, async call(path) {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handlers[path]({}, res); return res;
  } };
}
describe('4.33D actual acquisition handlers retain billing boundaries', () => {
  it.each(paths)('new user: %s rejects without writes/provider', async path => {
    const h = harness(); const res = await h.call(path);
    expect(res.statusCode).toBe(402); expect(res.body.code).toBe('AI_REQUIRES_PRO');
    expect(h.write).not.toHaveBeenCalled(); expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(paths)('Pro, including founder: %s stays included, no second product', async path => {
    const h = harness({ pro: true }); const res = await h.call(path);
    expect(res.statusCode).toBe(409); expect(res.body.code).toBe('AI_INCLUDED_IN_PRO');
    expect(h.write).not.toHaveBeenCalled(); expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(['trialing', 'active'])('legacy %s trial endpoint reuses existing row, never extends it', async status => {
    const subscription = { status, trial_ends_at: '2099-01-01', current_period_end: '2099-01-01' };
    const h = harness({ subscription }); const res = await h.call(paths[0]);
    expect(res.statusCode).toBe(200); expect(res.body.subscription).toEqual(subscription); expect(res.body.already_started).toBe(true);
    expect(h.write).not.toHaveBeenCalled(); expect(h.provider).not.toHaveBeenCalled();
  });
  it('expired legacy trial is not renewed', async () => {
    const h = harness({ subscription: { status: 'expired', trial_started_at: '2020-01-01' } });
    expect((await h.call(paths[0])).body.code).toBe('TRIAL_ALREADY_USED');
    expect((await h.call(paths[1])).body.code).toBe('AI_REQUIRES_PRO');
    expect(h.write).not.toHaveBeenCalled(); expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(paths)('anonymous: %s remains unauthorized', async path => {
    const h = harness({ user: null }); expect((await h.call(path)).statusCode).toBe(401);
    expect(h.write).not.toHaveBeenCalled();
  });
});
