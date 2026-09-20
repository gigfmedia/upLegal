import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaseEditDialog } from '@/components/lawyer/CaseEditDialog';
import type { LawyerCase } from '@/hooks/useLawyerCases';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), remove: vi.fn(), toast: vi.fn(), capture: vi.fn(), onDeleted: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/hooks/useLawyerCases', () => ({ useLawyerCases: () => ({ deleteCase: mocks.remove, updateCase: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('posthog-js', () => ({ default: { capture: mocks.capture } }));
const row = { id: 'a', title: 'Caso', status: 'new', source: 'LAWYER_DIRECT' } as LawyerCase;
function view(open = true, data = row) {
  return <MemoryRouter><CaseEditDialog open={open} onOpenChange={vi.fn()} caseData={data} clients={[]} onSaved={vi.fn()} onDeleted={mocks.onDeleted} /></MemoryRouter>;
}
const deleteButton = () => screen.queryByRole('button', { name: 'Eliminar caso vacío' });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: { can_delete: true }, error: null });
  mocks.remove.mockResolvedValue(undefined);
  vi.stubGlobal('confirm', vi.fn(() => true));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('canonical case deletion in real edit dialog and eligibility hook', () => {
  it('fetches only on open and allows an empty case; one confirmed event', async () => {
    const ui = render(view(false));
    expect(mocks.rpc).not.toHaveBeenCalled();
    ui.rerender(view());
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar caso vacío' }));
    await waitFor(() => expect(mocks.capture).toHaveBeenCalledTimes(1));
    expect(mocks.remove).toHaveBeenCalledWith('a');
    expect(mocks.onDeleted).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('get_case_delete_eligibility', { p_case_id: 'a' });
  });
  it.each(['worked', 'LEGALUP_MARKETPLACE', 'UNKNOWN'])('does not offer deletion when authority denies %s', async (source) => {
    mocks.rpc.mockResolvedValue({ data: { can_delete: false }, error: null });
    render(view(true, { ...row, source } as LawyerCase));
    await waitFor(() => expect(screen.queryByText(/Comprobando/)).not.toBeInTheDocument());
    expect(deleteButton()).not.toBeInTheDocument();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('loading, failed RPC and stale responses fail closed', async () => {
    let resolve!: (value: unknown) => void;
    mocks.rpc.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const ui = render(view());
    expect(deleteButton()).not.toBeInTheDocument();
    mocks.rpc.mockRejectedValueOnce(new Error('network'));
    ui.rerender(view(true, { ...row, id: 'b' }));
    resolve({ data: { can_delete: true }, error: null });
    await waitFor(() => expect(screen.queryByText(/Comprobando/)).not.toBeInTheDocument());
    expect(deleteButton()).not.toBeInTheDocument();
  });
  it('a DB race rejection shows close guidance without success analytics', async () => {
    mocks.remove.mockRejectedValue({ message: 'CASE_NOT_DELETABLE' });
    render(view());
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar caso vacío' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('Ciérralo') })));
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('prevents duplicate deletion while pending', async () => {
    let resolve!: () => void;
    mocks.remove.mockImplementationOnce(() => new Promise<void>(r => { resolve = r; }));
    render(view());
    const button = await screen.findByRole('button', { name: 'Eliminar caso vacío' });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(mocks.capture).toHaveBeenCalledTimes(1));
  });
});
