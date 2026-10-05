import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gcalState = vi.hoisted(() => ({
  connected: true,
  invokeCalls: [] as unknown[],
  invokeResult: { data: { success: true }, error: null } as { data: unknown; error: unknown },
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: 'L1' } } }),
      getSession: async () => ({ data: { session: { access_token: 'sess' } } }),
    },
    from: () => {
      throw new Error('direct table access is forbidden in tests');
    },
    functions: {
      invoke: async (fn: string, opts: unknown) => {
        gcalState.invokeCalls.push({ fn, opts });
        if (fn === 'google-auth/status') {
          return { data: { connected: gcalState.connected }, error: null };
        }
        return gcalState.invokeResult;
      },
    },
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { GoogleCalendarConnect } from '@/components/dashboard/GoogleCalendarConnect';

beforeEach(() => {
  gcalState.connected = true;
  gcalState.invokeCalls.length = 0;
  gcalState.invokeResult = { data: { success: true }, error: null };
});

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');
const edgeSrc = () => read('supabase/functions/google-auth/index.ts');

describe('FASE 4.60C — scopes mínimos', () => {
  it('28. auth URL con events + freebusy, sin scope full calendar', () => {
    const src = edgeSrc();
    expect(src).toContain('https://www.googleapis.com/auth/calendar.events');
    expect(src).toContain('https://www.googleapis.com/auth/calendar.freebusy');
    // El scope full `calendar` no debe aparecer como scope solicitado
    // (puede aparecer en comentarios que expliquen su remoción).
    const scopeLines = src.split('\n').filter((l) => l.includes('googleapis.com/auth/calendar'));
    expect(scopeLines.every((l) => l.trim().startsWith('//')) || scopeLines.length === 2).toBe(true);
    expect(src).toContain('access_type=offline');
    expect(src).toContain('prompt=consent');
  });
  it('30/31. freeBusy y events.insert siguen soportados por los scopes', () => {
    expect(read('supabase/functions/get-google-busy-slots/index.ts')).toContain('freeBusy');
    const meet = read('supabase/functions/create-google-meeting/index.ts');
    expect(meet).toContain('calendars/primary/events');
    expect(meet).toContain('conferenceData');
  });
});

describe('FASE 4.60C — sin logs de tokens', () => {
  it('29. ningún log con valores de tokens, codes ni secrets', () => {
    const src = edgeSrc();
    const consoleLines = src.split('\n').filter((l) => l.includes('console.'));
    for (const line of consoleLines) {
      const cleaned = line.replace(/has_refresh_token/g, '');
      expect(cleaned, line).not.toMatch(/access_token|refresh_token/);
      expect(cleaned, line).not.toMatch(/client_secret|authorization_code/);
    }
    expect(src).toContain('GOOGLE_OAUTH_EXCHANGE_OK');
    expect(src).toContain('has_refresh_token');
  });
});

describe('FASE 4.60C — disconnect server-side', () => {
  it('32/33/34. revoke + idempotencia + falla transitoria preserva fila', () => {
    const src = edgeSrc();
    expect(src).toContain("path === 'disconnect'");
    expect(src).toContain('https://oauth2.googleapis.com/revoke');
    expect(src).toContain('already_disconnected');
    expect(src).toContain('REVOKE_FAILED');
    expect(src).toContain('REVOKE_UNREACHABLE');
    // La respuesta al browser solo trae success/flags, nunca valores de tokens.
    const discBlock = src.slice(src.indexOf("path === 'disconnect'"), src.indexOf("path === 'callback'"));
    const responses = [...discBlock.matchAll(/new Response\(JSON\.stringify\(([\s\S]*?)\)\s*,/g)].map((m) => m[1]);
    expect(responses.length).toBeGreaterThan(0);
    for (const r of responses) {
      expect(r).not.toMatch(/access_token|refresh_token/);
    }
  });
  it('35. ownership: revoca/borra solo la integración del usuario del token', () => {
    const src = edgeSrc();
    const discBlock = src.slice(src.indexOf("path === 'disconnect'"), src.indexOf("path === 'callback'"));
    expect(discBlock).toContain('.eq(\'user_id\', user.id)');
    expect(discBlock).toContain('getUser(token)');
  });
  it('frontend usa el endpoint canónico; cero acceso directo a la tabla', () => {
    for (const p of [
      'src/components/dashboard/GoogleCalendarConnect.tsx',
      'src/components/dashboard/GoogleCalendarNotice.tsx',
    ]) {
      const src = read(p);
      expect(src, p).toContain('google-auth/status');
      expect(src, p).not.toContain("from('google_integrations')");
    }
  });
});

describe('FASE 4.60C — disconnect runtime', () => {
  it('32/36. éxito: llama revoke server-side sin tokens y queda desconectado', async () => {
    render(<GoogleCalendarConnect />);
    await waitFor(() => expect(screen.getByText('Conectado')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }));
    await waitFor(() => expect(
      gcalState.invokeCalls.some((c) => (c as { fn: string }).fn === 'google-auth/disconnect')
    ).toBe(true));
    const call = gcalState.invokeCalls.find((c) => (c as { fn: string }).fn === 'google-auth/disconnect') as { fn: string; opts: unknown };
    expect(call.fn).toBe('google-auth/disconnect');
    expect(JSON.stringify(call.opts)).not.toMatch(/access_token|refresh_token/);
    await waitFor(() => expect(screen.getByText('No conectado')).toBeInTheDocument());
  });
  it('falla transitoria: no afirma desconexión y conserva estado', async () => {
    gcalState.invokeResult = { data: null, error: new Error('timeout') };
    render(<GoogleCalendarConnect />);
    await waitFor(() => expect(screen.getByText('Conectado')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }));
    await waitFor(() => expect(
      gcalState.invokeCalls.some((c) => (c as { fn: string }).fn === 'google-auth/disconnect')
    ).toBe(true));
    expect(screen.getByText('Conectado')).toBeInTheDocument();
  });
});

describe('FASE 4.60C.1 — endpoint status + RLS sin SELECT', () => {
  it('status responde solo {connected}, con JWT y scoping propio', () => {
    const src = read('supabase/functions/google-auth/index.ts');
    const block = src.slice(src.indexOf("path === 'status'"), src.indexOf("path === 'disconnect'"));
    expect(block).toContain('getUser(token)');
    expect(block).toContain(".eq('user_id', user.id)");
    expect(block).toContain('connected');
    expect(block).not.toMatch(/access_token|refresh_token/);
    expect(block).toContain('401');
  });
  it('migración elimina el SELECT autenticado (nombre exacto de prod)', () => {
    const sql = read('supabase/migrations/20261013000000_harden_google_integrations_token_access.sql');
    expect(sql).toContain('DROP POLICY IF EXISTS "Users can view their own google integration"');
    expect(sql).toContain('ON public.google_integrations');
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });
});

describe('FASE 4.60C — privacy y copy', () => {
  it('37. disclosure concisa de Calendar en la política', () => {
    const src = read('src/pages/PrivacyPolicy.tsx');
    expect(src).toContain('Google Calendar');
    expect(src).toContain('horarios ocupados');
    expect(src).toContain('desconectar');
    expect(src).toContain('revoca');
    expect(src.toLowerCase()).toContain('no se utilizan con fines publicitarios');
  });
  it('copy de conexión describe uso real, no sync total', () => {
    const src = read('src/components/dashboard/GoogleCalendarConnect.tsx');
    expect(src).not.toMatch(/sincronizaci.n completa|bidireccional/i);
    expect(src).toContain('horarios ocupados');
  });
});
