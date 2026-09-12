import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const hookMocks = {
  cases: vi.fn(),
  clients: vi.fn(),
  pro: vi.fn(),
  createCase: vi.fn(),
  refetchClients: vi.fn(),
  toast: vi.fn(),
};

vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCases: (...args: unknown[]) => hookMocks.cases(...args),
}));
vi.mock('@/hooks/useLawyerClients', () => ({
  useLawyerClients: (...args: unknown[]) => hookMocks.clients(...args),
}));
vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: (...args: unknown[]) => hookMocks.pro(...args),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: hookMocks.toast }),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import CasesPage from '@/pages/lawyer/CasesPage';

const clientA = { id: 'client-a', name: 'Client A', email: 'a@test.invalid' };
const clientB = { id: 'client-b', name: 'Client B', email: null };

function setup(opts: {
  cases?: unknown[];
  clients?: unknown[];
  clientsLoading?: boolean;
  clientsError?: string | null;
  hasProAccess?: boolean;
} = {}) {
  hookMocks.createCase.mockResolvedValue({ id: 'new-case' });
  hookMocks.cases.mockReturnValue({
    cases: opts.cases ?? [],
    loading: false,
    error: null,
    createCase: hookMocks.createCase,
  });
  hookMocks.clients.mockReturnValue({
    clients: opts.clients ?? [],
    loading: opts.clientsLoading ?? false,
    error: opts.clientsError ?? null,
    refetch: hookMocks.refetchClients,
  });
  hookMocks.pro.mockReturnValue({ hasProAccess: opts.hasProAccess ?? false });
  render(
    <MemoryRouter>
      <CasesPage />
    </MemoryRouter>
  );
}

function openDialog() {
  fireEvent.click(screen.getAllByRole('button', { name: /nuevo caso/i })[0]);
}

async function openClientSelect() {
  const trigger = screen.getByRole('combobox');
  fireEvent.click(trigger);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Sin cliente' })).toBeInTheDocument());
}

describe('4.31C — New Case client dropdown', () => {
  beforeEach(() => vi.clearAllMocks());

  it('0 clients: dropdown shows only "Sin cliente"', async () => {
    setup({ clients: [] });
    openDialog();
    await openClientSelect();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Sin cliente');
  });

  it('2 clients: dropdown shows both names without visiting ClientsPage', async () => {
    setup({ clients: [clientA, clientB] });
    openDialog();
    await openClientSelect();
    expect(screen.getByRole('option', { name: /Client A/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Client B/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('loading: shows loading state, not a misleading final empty list', async () => {
    setup({ clients: [], clientsLoading: true });
    openDialog();
    expect(screen.getByText(/Cargando clientes/i)).toBeInTheDocument();
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('error: shows retry that refetches clients', async () => {
    setup({ clients: [], clientsError: 'Error al cargar clientes' });
    openDialog();
    expect(screen.getByText(/No se pudieron cargar los clientes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(hookMocks.refetchClients).toHaveBeenCalled();
  });

  it('opening dialog refetches clients (fresh load)', async () => {
    setup({ clients: [clientA] });
    expect(hookMocks.refetchClients).not.toHaveBeenCalled();
    openDialog();
    await waitFor(() => expect(hookMocks.refetchClients).toHaveBeenCalledTimes(1));
  });

  it('selecting client creates case with correct client_id', async () => {
    setup({ clients: [clientA, clientB] });
    openDialog();
    await openClientSelect();
    fireEvent.click(screen.getByRole('option', { name: /Client B/ }));
    fireEvent.change(screen.getByPlaceholderText(/Divorcio Juan Pérez/i), { target: { value: 'Caso test' } });
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() => expect(hookMocks.createCase).toHaveBeenCalled());
    expect(hookMocks.createCase).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-b', source: 'LAWYER_DIRECT' })
    );
  });

  it('"Sin cliente" creates case with null client_id', async () => {
    setup({ clients: [clientA] });
    openDialog();
    fireEvent.change(screen.getByPlaceholderText(/Divorcio Juan Pérez/i), { target: { value: 'Caso sin cliente' } });
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() => expect(hookMocks.createCase).toHaveBeenCalled());
    expect(hookMocks.createCase).toHaveBeenCalledWith(expect.objectContaining({ client_id: null }));
  });

  it('no duplicates when same client appears once in source', async () => {
    setup({ clients: [clientA, clientB] });
    openDialog();
    await openClientSelect();
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names.filter((t) => t?.includes('Client A'))).toHaveLength(1);
  });

  it('first-free copy preserved', async () => {
    setup({ clients: [], hasProAccess: false });
    openDialog();
    expect(screen.getByText(/Tu primer caso no requiere suscripción/i)).toBeInTheDocument();
  });

  it('second direct case still triggers Pro gate (no dialog, no create)', async () => {
    setup({
      cases: [{ id: 'd-1', title: 'Caso 1', status: 'new', source: 'LAWYER_DIRECT', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
      hasProAccess: false,
    });
    fireEvent.click(screen.getAllByRole('button', { name: /nuevo caso/i })[0]);
    expect(screen.queryByText('Nuevo caso', { selector: 'h2' })).not.toBeInTheDocument();
    expect(hookMocks.createCase).not.toHaveBeenCalled();
  });
});
