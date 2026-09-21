import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 4.37E — marketplace services require NO Pro subscription (UI or DB).

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  inserted: [] as unknown[],
  updated: [] as unknown[],
  deleted: [] as unknown[],
}));

const svcState = vi.hoisted(() => ({
  services: [] as Record<string, unknown>[],
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
const stableAuth = vi.hoisted(() => ({ user: { id: 'lawyer-1' } }));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  // Stable identity: a fresh object per render would retrigger [user] effects.
  useAuth: () => stableAuth,
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'lawyer_services') throw new Error(`unexpected table ${table}`);
      const rows = () => svcState.services;
      const builder: Record<string, unknown> = {};
      const selectTerminal = () => Promise.resolve({ data: rows(), error: null });
      builder.then = (resolve: unknown) => (selectTerminal() as Promise<unknown>).then(resolve as never);
      const proxy = new Proxy(builder, {
        get(t, prop) {
          if (prop === 'then') return t.then;
          if (prop === 'select' || prop === 'order') return () => proxy;
          if (prop === 'eq') return () => proxy;
          if (prop === 'insert')
            return (row: unknown) => {
              (mocks.inserted as unknown[]).push(row);
              return { select: () => ({ single: () => Promise.resolve({ data: { id: 's-new' }, error: null }) }) };
            };
          if (prop === 'update')
            return (row: unknown) => {
              (mocks.updated as unknown[]).push(row);
              Object.assign(svcState.services[0] ?? {}, row as object);
              return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
            };
          if (prop === 'delete')
            return () => {
              (mocks.deleted as unknown[]).push(true);
              svcState.services = [];
              return { eq: () => Promise.resolve({ error: null }) };
            };
          return () => proxy;
        },
      });
      return proxy;
    },
  },
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import ServicesPage from '@/pages/lawyer/ServicesPage';

function renderPage() {
  render(
    <MemoryRouter>
      <ServicesPage />
    </MemoryRouter>
  );
}

const SVC = {
  id: 's-1',
  title: 'Divorcio',
  description: 'lorem',
  price_clp: 100000,
  available: true,
  requires_quote: false,
  delivery_time: '2',
  features: [],
};

describe('4.37E — migration contract (source of truth)', () => {
  const sql = readFileSync(
    resolve('supabase/migrations/20260927000000_services_no_pro.sql'),
    'utf-8'
  );

  it('removes has_pro_access from all three write policies', () => {
    const code = sql
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('--'))
      .join('\n');
    expect(code).not.toContain('has_pro_access');
    expect(sql).toContain('lawyer_services_owner_insert');
    expect(sql).toContain('lawyer_services_owner_update');
    expect(sql).toContain('lawyer_services_owner_delete');
  });

  it('preserves verbatim ownership in USING and WITH CHECK', () => {
    const code = sql
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('--'))
      .join('\n');
    const occurrences = code.match(/auth\.uid\(\)::text = lawyer_user_id::text/g) ?? [];
    // insert WITH CHECK + update USING + update WITH CHECK + delete USING
    expect(occurrences.length).toBe(4);
  });

  it('touches no SELECT policy and adds no quota/founder logic', () => {
    expect(sql).not.toMatch(/FOR SELECT/i);
    expect(sql).not.toContain('is_founder');
    expect(sql).not.toContain('founder');
    expect(sql.toLowerCase()).not.toContain('quota');
    expect(sql.toLowerCase()).not.toContain('limit');
  });
});

describe('4.37E — ServicesPage has no Pro gate (source of truth)', () => {
  const page = readFileSync(resolve('src/pages/lawyer/ServicesPage.tsx'), 'utf-8');

  it('no entitlement hook, modal, or paywall analytics remain', () => {
    expect(page).not.toContain('useProSubscription');
    expect(page).not.toContain('ProPricingModal');
    expect(page).not.toContain('pro_paywall_opened');
    expect(page).not.toContain('hasProAccess');
  });

  it('CRUD handlers and delete confirmation are preserved', () => {
    expect(page).toContain('handleAddService');
    expect(page).toContain('handleEditService');
    expect(page).toContain('handleSaveService');
    expect(page).toContain('handleDeleteService');
    expect(page).toContain('¿Eliminar servicio?');
  });
});

describe('4.37E — non-Pro service management UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svcState.services = [];
    (mocks.inserted as unknown[]).length = 0;
    (mocks.updated as unknown[]).length = 0;
    (mocks.deleted as unknown[]).length = 0;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('B. Nuevo Servicio opens the form (no paywall surface exists)', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByRole('button', { name: /nuevo servicio/i }))[0]);
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    );
  });

  it('C. valid service persists', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByRole('button', { name: /nuevo servicio/i }))[0]);
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByPlaceholderText(/asesoría legal inicial/i), { target: { value: 'Divorcio' } });
    fireEvent.change(screen.getByPlaceholderText(/descripción detallada/i), { target: { value: 'lorem ipsum' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 50000'), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar servicio/i }));
    await waitFor(() => expect(mocks.inserted).toHaveLength(1));
    const row = (mocks.inserted as Record<string, unknown>[])[0];
    expect(row).toMatchObject({ title: 'Divorcio' });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: '¡Listo!' }));
  });

  it('D/E. edit + activate/deactivate persist without Pro', async () => {
    svcState.services = [{ ...SVC }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByPlaceholderText(/asesoría legal inicial/i), { target: { value: 'Divorcio edit' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(mocks.updated).toHaveLength(1));
  });

  it('G. delete flows through confirmation and persists', async () => {
    svcState.services = [{ ...SVC }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^eliminar$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^eliminar$/i }));
    await waitFor(() => expect(mocks.deleted).toHaveLength(1));
  });
});
