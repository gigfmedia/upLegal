import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const pageState = vi.hoisted(() => ({
  clients: [] as Record<string, unknown>[],
  hasProAccess: false,
  createImpl: null as null | ((input: Record<string, unknown>) => Promise<unknown>),
  toasts: [] as unknown[],
}));

vi.mock('@/hooks/useLawyerClients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useLawyerClients')>();
  return {
    ...actual,
    useLawyerClients: () => ({
      clients: pageState.clients,
      loading: false,
      error: null,
      createClient: (input: Record<string, unknown>) =>
        pageState.createImpl ? pageState.createImpl(input) : Promise.resolve({ id: 'c-new', ...input }),
    }),
  };
});

vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({ hasProAccess: pageState.hasProAccess }),
}));

vi.mock('@/hooks/useClientCommunications', () => ({
  useClientFollowUpOverview: () => ({ lastByClient: new Map(), overdueClientIds: new Set() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: (t: unknown) => pageState.toasts.push(t), dismiss: vi.fn() }),
}));

vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: (props: { open: boolean }) => (props.open ? <div>Paywall modal</div> : null),
}));

vi.mock('@/lib/posthogLoader', () => ({ posthog: { capture: vi.fn() } }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import ClientsPage from '../ClientsPage';

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/lawyer/clients']}>
      <Routes>
        <Route path="/lawyer/clients" element={<ClientsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
  await screen.findByRole('dialog');
}

async function submitAs(name: string) {
  const input = screen.getByPlaceholderText('Juan Pérez');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
}

beforeEach(() => {
  pageState.clients = [];
  pageState.hasProAccess = false;
  pageState.createImpl = null;
  pageState.toasts = [];
  vi.unstubAllGlobals();
});

describe('ClientsPage — cupo de primer cliente gratuito', () => {
  it('gratuito sin clientes: abre el diálogo (sin paywall)', async () => {
    renderAt();
    await openDialog();
    expect(screen.queryByText('Paywall modal')).not.toBeInTheDocument();
  });

  it('gratuito con un cliente: muestra paywall (segundo requiere Pro)', async () => {
    pageState.clients = [{ id: 'c1', name: 'Ana', email: null, phone: null, created_at: new Date().toISOString() }];
    renderAt();
    await screen.findByText('Ana');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    expect(await screen.findByText('Paywall modal')).toBeInTheDocument();
  });

  it('Pro con varios clientes: abre el diálogo (ilimitado)', async () => {
    pageState.hasProAccess = true;
    pageState.clients = [
      { id: 'c1', name: 'Ana', email: null, phone: null, created_at: new Date().toISOString() },
      { id: 'c2', name: 'Beto', email: null, phone: null, created_at: new Date().toISOString() },
    ];
    renderAt();
    await openDialog();
    expect(screen.queryByText('Paywall modal')).not.toBeInTheDocument();
  });

  it('envío exitoso del primero: crea, cierra y avisa', async () => {
    const created = { id: 'c-new', name: 'Ana' };
    pageState.createImpl = async () => created;
    renderAt();
    await openDialog();
    await submitAs('Ana');
    await waitFor(() => expect(pageState.toasts).toContainEqual(expect.objectContaining({ title: 'Cliente creado' })));
    expect(screen.queryByText('Paywall modal')).not.toBeInTheDocument();
  });

  it('cupo consumido (token backend): abre paywall, sin error seco', async () => {
    pageState.createImpl = async () => {
      throw new Error('LegalUp Pro required: free client allowance already consumed. [FREE_CLIENT_ALLOWANCE_CONSUMED]');
    };
    renderAt();
    await openDialog();
    await submitAs('Otro');
    expect(await screen.findByText('Paywall modal')).toBeInTheDocument();
    expect(pageState.toasts).not.toContainEqual(expect.objectContaining({ title: 'Error' }));
  });
});
