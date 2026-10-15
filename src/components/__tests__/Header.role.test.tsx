import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/**
 * El badge del avatar refleja userRole = metadata.role ?? user.role ??
 * user.profile.role ?? 'client' (Header.tsx). Estos tests fijan la
 * semántica de presentación; el bug P1 está aguas arriba (el estado que
 * alimenta este componente), cubierto en useAuthState.transient.test.ts.
 */
const headerAuth = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
}));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: headerAuth.user, logout: vi.fn() }),
}));

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import Header from '@/components/Header';

function renderHeader() {
  render(
    <MemoryRouter initialEntries={['/search']}>
      <Routes>
        <Route path="/search" element={<Header />} />
      </Routes>
    </MemoryRouter>,
  );
  // El badge vive dentro del dropdown: abrirlo primero (Radix exige
  // pointerdown + click en jsdom).
  const trigger = document.querySelector('button.rounded-full');
  if (!trigger) throw new Error('sin trigger de avatar');
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
}

describe('Header — badge de rol del avatar', () => {
  it("perfil lawyer confirmado: muestra 'Abogado'", async () => {
    headerAuth.user = {
      id: 'U-1',
      email: 'a@test.cl',
      user_metadata: {},
      profile: { id: 'U-1', role: 'lawyer' },
    };
    renderHeader();
    expect(await screen.findByText('Abogado', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText('Cliente')).not.toBeInTheDocument();
  });

  it("metadata lawyer sin perfil adjunto: muestra 'Abogado'", async () => {
    headerAuth.user = {
      id: 'U-1',
      email: 'a@test.cl',
      user_metadata: { role: 'lawyer' },
    };
    renderHeader();
    expect(await screen.findByText('Abogado', undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it("perfil client: muestra 'Cliente'", async () => {
    headerAuth.user = {
      id: 'U-1',
      email: 'a@test.cl',
      user_metadata: {},
      profile: { id: 'U-1', role: 'client' },
    };
    renderHeader();
    expect(await screen.findByText('Cliente', undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it('perfil manda sobre metadata: client en perfil + lawyer en metadata muestra Cliente', async () => {
    headerAuth.user = {
      id: 'U-1',
      email: 'a@test.cl',
      user_metadata: { role: 'lawyer' },
      profile: { id: 'U-1', role: 'client' },
    };
    renderHeader();
    expect(await screen.findByText('Cliente', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText('Abogado')).not.toBeInTheDocument();
  });
});
