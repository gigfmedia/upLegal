import { describe, it, expect, vi } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { retiredAITrialInvite } from './retiredAITrialInvite.mjs';
describe('retired standalone AI acquisition', () => {
  it('actual registered admin route returns 410 without touching email or database', () => {
    const source = readFileSync('server.mjs','utf8');
    const route = source.match(/app\.post\('\/api\/admin\/ai\/send-lawyer-invite',[^\n]+/)[0];
    const admin = vi.fn(); const register = vi.fn(); const send = vi.fn(); const db = vi.fn();
    vm.runInNewContext(route, { app: { post: register }, requireAdmin: admin, retiredAITrialInvite, resend: { emails: { send } }, supabase: { from: db } });
    expect(register.mock.calls[0].slice(0,2)).toEqual(['/api/admin/ai/send-lawyer-invite',admin]);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    register.mock.calls[0][2]({ body: { lawyerIds: ['new-user','legacy-user'] } },res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AI_TRIAL_INVITE_RETIRED', success: false }));
    expect(send).not.toHaveBeenCalled(); expect(db).not.toHaveBeenCalled();
  });
});
