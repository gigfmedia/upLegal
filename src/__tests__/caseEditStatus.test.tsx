import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CasesPage from '@/pages/lawyer/CasesPage';

const state = vi.hoisted(() => ({ row: {} as Record<string, unknown>, fail: false, updates: vi.fn() }));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({ useAuth: () => ({ user: { id: 'lawyer' } }) }));
vi.mock('@/hooks/useLawyerClients', () => ({ useLawyerClients: () => ({ clients: [], loading: false }) }));
vi.mock('@/hooks/useProSubscription', () => ({ useProSubscription: () => ({ hasProAccess: true }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({ ProPricingModal: () => null }));
vi.mock('@/lib/activationAnalytics', () => ({ trackFirstCaseIfNeeded: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/lib/supabaseClient', () => ({ supabase: { from: () => {
 let patch: Record<string, unknown> | undefined;
 const q = {
  select: () => q, eq: () => q,
  order: async () => ({ data: [{ ...state.row }], error: null }),
  update: (value: Record<string, unknown>) => { patch = value; state.updates(value); return q; },
  single: async () => {
   if (state.fail) return { data: null, error: new Error('No se pudo guardar') };
   state.row = { ...state.row, ...patch };
   return { data: { ...state.row }, error: null };
  },
 };
 return q;
} } }));

beforeEach(() => {
 state.row = { id: 'case', lawyer_id: 'lawyer', title: 'Caso de prueba', status: 'new', source: 'LAWYER_DIRECT', created_at: '2026-09-01', updated_at: '2026-09-01', ai_workspace_id: null };
 state.fail = false; state.updates.mockClear();
 Element.prototype.scrollIntoView = vi.fn();
 Element.prototype.hasPointerCapture = vi.fn(() => false);
 Element.prototype.setPointerCapture = vi.fn();
 Element.prototype.releasePointerCapture = vi.fn();
});
afterEach(cleanup);
async function openEdit() {
 fireEvent.click(await screen.findByRole('button', { name: 'Editar caso Caso de prueba' }));
 return screen.findByRole('dialog', { name: 'Editar caso' });
}
async function chooseStatus(label: string) {
 const dialog = screen.getByRole('dialog', { name: 'Editar caso' });
 fireEvent.keyDown(within(dialog).getAllByRole('combobox')[0], { key: 'ArrowDown' });
 fireEvent.click(await screen.findByRole('option', { name: label }));
}
describe('case status editing with real page, modal and case hooks', () => {
 it('persists status and reloads it when reopening, twice', async () => {
  state.row.status = 'paid';
  render(<MemoryRouter><CasesPage /></MemoryRouter>);
  for (const [label, value] of [['Cerrado', 'closed'], ['En progreso', 'in_progress']]) {
   await openEdit(); await chooseStatus(label);
   fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
   await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar caso' })).not.toBeInTheDocument());
   expect(state.updates).toHaveBeenLastCalledWith(expect.objectContaining({ status: value }));
   expect(state.row.status).toBe(value);
   const dialog = await openEdit();
   expect(within(dialog).getAllByRole('combobox')[0]).toHaveTextContent(label);
   fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
  }
  expect(state.updates).toHaveBeenCalledTimes(2);
 });
 it('failed save leaves the dialog open and does not change persisted status', async () => {
  state.fail = true;
  render(<MemoryRouter><CasesPage /></MemoryRouter>);
  await openEdit(); await chooseStatus('Cerrado');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).not.toBeDisabled());
  expect(state.row.status).toBe('new');
  expect(screen.getByRole('dialog', { name: 'Editar caso' })).toBeInTheDocument();
 });
});
