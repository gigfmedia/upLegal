import { beforeEach, describe, expect, it, vi } from 'vitest';
const getSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { getSession } } }));
import { companyApiFetch } from '@/lib/companyApi';

describe('Private company API transport', () => {
  beforeEach(() => { vi.restoreAllMocks(); getSession.mockReset(); });
  it('sends the session Bearer and preserves request body', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'session-token' } }, error: null });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await companyApiFetch('/api/empresas/budgets/1/reject', { method: 'POST', body: '{"reason":"test"}', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer forged' } });
    const options = fetchSpy.mock.calls[0][1]!;
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer session-token');
    expect(options.body).toBe('{"reason":"test"}');
  });
  it('does not send private requests without a session', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(companyApiFetch('/api/empresas/budgets')).rejects.toThrow('iniciar sesión');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('propagates a 403 instead of reporting false success', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'session-token' } }, error: null });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"Permisos insuficientes"}', { status: 403 }));
    await expect(companyApiFetch('/api/empresas/budgets/1/approve', { method: 'POST' })).rejects.toThrow('Permisos insuficientes');
  });
});
