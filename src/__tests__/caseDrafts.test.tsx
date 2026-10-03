import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AICaseDrafts } from '@/components/legalup-ai/AICaseDrafts';

// FASE 4.59D — UI Borradores: lista, creación validada, sin nuevo tab.

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok', user: { id: 'u' } } } }) } },
}));

vi.mock('@/lib/aiOperationIdentity', () => ({
  aiOperationIdentity: async () => ({ id: 'op-1', complete: () => {} }),
}));

vi.mock('@/lib/aiInProgressPoll', () => ({
  pollTerminalResult: async (fn: () => Promise<{ res: Response; body: unknown }>) => fn(),
}));

const DRAFT = {
  id: 'd1', draft_type: 'escrito', title: 'Borrador de contestación', status: 'completed',
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  intelligence_snapshot_id: 's1', instruction: 'instr', content: '# Borrador\n\nContenido.',
  sources: [], model: 'm',
};

let fetchMock: ReturnType<typeof vi.fn>;
let usageAllowance: unknown = { plan: 'pro_limited', drafting: { used: 12, limit: 30 } };
beforeEach(() => {
  usageAllowance = { plan: 'pro_limited', drafting: { used: 12, limit: 30 } };
  fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
    if (url.includes('/api/ai/usage')) {
      return { ok: true, json: async () => ({ allowance: usageAllowance }) } as Response;
    }
    if (opts?.method === 'POST') {
      return { ok: true, json: async () => ({ draft: DRAFT, snapshot: { version: 1 } }) } as Response;
    }
    if (opts?.method === 'PUT') {
      return { ok: true, json: async () => ({ draft: DRAFT }) } as Response;
    }
    if (/\/drafts\/[^/]+$/.test(url)) {
      return { ok: true, json: async () => ({ draft: DRAFT }) } as Response;
    }
    return { ok: true, json: async () => ({ drafts: [DRAFT] }) } as Response;
  });
  (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
});

  it('muestra uso Pro y gating al límite', async () => {
    renderDrafts();
    expect(await screen.findByText('12 de 30 este mes')).toBeTruthy();
    usageAllowance = { plan: 'pro_limited', drafting: { used: 30, limit: 30 } };
    cleanup();
    renderDrafts();
    expect(await screen.findByText(/Has utilizado los 30 borradores/)).toBeTruthy();
    expect(screen.getByText('Ver LegalUp Plus')).toBeTruthy();
  });

  it('free muestra gating Pro sin contador', async () => {
    usageAllowance = { plan: 'free_case', drafting: { used: 0, limit: 0 } };
    renderDrafts();
    expect(await screen.findByText('Ver LegalUp Pro')).toBeTruthy();
    expect(screen.queryByText(/de 30 este mes/)).toBeNull();
  });

afterEach(cleanup);

function renderDrafts() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AICaseDrafts workspaceId="w1" />
    </QueryClientProvider>
  );
}

describe('FASE 4.59D.2 workspace directo', () => {
  it('título canónico + formulario visible sin click intermedio', async () => {
    renderDrafts();
    expect(screen.getByText('Redacción asistida')).toBeTruthy();
    expect(screen.getByText('¿Qué necesitas preparar?')).toBeTruthy();
    expect(screen.getByText('Generar borrador')).toBeTruthy();
    expect(screen.queryByText('Crear borrador')).toBeNull();
    expect(await screen.findByText('Borrador de contestación')).toBeTruthy();
  });

  it('sin "Crear borrador": el formulario ya está expuesto', () => {
    renderDrafts();
    expect(screen.queryByText(/^Crear borrador$/)).toBeNull();
    expect(screen.getByPlaceholderText(/Ej: borrador/)).toBeTruthy();
  });

  it('crear exige instrucción ≥10 y genera', async () => {
    renderDrafts();
    await screen.findByText('Borrador de contestación');
    const area = screen.getByPlaceholderText(/Ej: borrador/);
    fireEvent.change(area, { target: { value: 'corto' } });
    expect((screen.getByText('Generar borrador') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(area, { target: { value: 'Preparar contestación centrada en el requerimiento previo' } });
    expect((screen.getByText('Generar borrador') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Generar borrador'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/cases/w1/drafts'),
      expect.objectContaining({ method: 'POST' })
    ));
  });

  it('abrir muestra contenido persistido', async () => {
    renderDrafts();
    fireEvent.click(await screen.findByText('Borrador de contestación'));
    expect(await screen.findByText('Borrador de contestación')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Contenido\./)).toBeTruthy());
  });
});
