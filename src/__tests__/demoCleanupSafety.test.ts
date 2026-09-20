import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDemoData } from '@/lib/demoData';
const m = vi.hoisted(() => ({ calls: [] as string[], fail: '' }));
vi.mock('@/lib/supabaseClient', () => ({ supabase: { from: (table: string) => {
  const q = {
    select: () => q, eq: () => q,
    ilike: async () => ({ data: [{ id: 'qa-client' }], error: null }),
    delete: () => { m.calls.push(table); return q; },
    in: async () => ({ error: m.fail === table ? { message: 'CASE_NOT_DELETABLE' } : null }),
  };
  return q;
} } }));
beforeEach(() => { m.calls = []; m.fail = ''; });
describe('demo cleanup honors database deletion authority', () => {
  it('cleans bookings before empty cases, then clients, without a privileged bypass', async () => {
    await clearDemoData('lawyer');
    expect(m.calls).toEqual(['bookings', 'lawyer_cases', 'lawyer_clients']);
  });
  it('does not delete clients or swallow a worked-case rejection', async () => {
    m.fail = 'lawyer_cases';
    await expect(clearDemoData('lawyer')).rejects.toMatchObject({ message: 'CASE_NOT_DELETABLE' });
    expect(m.calls).toEqual(['bookings', 'lawyer_cases']);
  });
  it('stops if booking cleanup fails', async () => {
    m.fail = 'bookings';
    await expect(clearDemoData('lawyer')).rejects.toBeDefined();
    expect(m.calls).toEqual(['bookings']);
  });
});
