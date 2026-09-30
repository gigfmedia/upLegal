import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const db = vi.hoisted(() => ({
  profile: {
    user_id: 'L1',
    availability: { Lunes: [false, false, false, false, false, false, false, false, false, false] },
    meet_link: 'https://meet.google.com/abc-defg-hij',
  },
  lastUpdate: null as Record<string, unknown> | null,
}));

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'profiles') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { ...db.profile }, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: () => ({
            select: () => ({
              single: async () => {
                db.lastUpdate = payload;
                return { data: { ...db.profile, ...payload }, error: null };
              },
            }),
          }),
        }),
      };
    },
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
  toast: toastMock,
}));

import ManageAvailability, { AvailabilityGrid } from './ManageAvailability';

function openModal() {
  const utils = render(<ManageAvailability lawyerId="L1" isEditing onAvailabilityChange={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /gestionar disponibilidad/i }));
  return { ...utils, ready: screen.findByText('Gestionar disponibilidad semanal') };
}

beforeEach(() => {
  db.lastUpdate = null;
  db.profile.meet_link = 'https://meet.google.com/abc-defg-hij';
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

async function openGrid() {
  const utils = render(
    <AvailabilityGrid lawyerId="L1" onClose={() => {}} onAvailabilityChange={() => {}} />,
  );
  // Espera a que el grid cargue los datos del perfil (día + celdas)
  await screen.findByText('Lunes');
  await waitFor(() => {
    const count = utils.baseElement.querySelectorAll('button').length;
    if (count === 0) throw new Error('esperando celdas del grid');
  });
  return utils;
}

function cellButtons(baseElement: HTMLElement) {
  return Array.from(baseElement.querySelectorAll('button')).filter(
    (b) => !(b as HTMLButtonElement).disabled && (b.textContent ?? '').trim() === '',
  );
}

async function firstCell(baseElement: HTMLElement): Promise<HTMLElement> {
  let found: Element | undefined;
  await waitFor(() => {
    const cells = cellButtons(baseElement);
    if (cells.length === 0) throw new Error('esperando celdas del grid');
    found = cells[0];
  });
  return found as unknown as HTMLElement;
}

async function saveButton(baseElement: HTMLElement): Promise<HTMLElement> {
  let found: Element | undefined;
  await waitFor(() => {
    found = Array.from(baseElement.querySelectorAll('button')).find(
      (b) => !(b as HTMLButtonElement).disabled && (b.textContent ?? '').includes('Guardar'),
    );
    if (!found) throw new Error('esperando botón Guardar cambios habilitado');
  });
  return found as unknown as HTMLElement;
}

describe('4.56G availability sin Meet', () => {
  it('no renderiza campo Meet ni texto de fallback', async () => {
    await openModal();
    expect(screen.queryByText('Enlace de Google Meet')).toBeNull();
    expect(screen.queryByText(/generación automática falla/)).toBeNull();
    expect(screen.queryByPlaceholderText(/meet\.google\.com/)).toBeNull();
    expect(screen.getByText('Selecciona los horarios en los que estás disponible para atender citas')).toBeTruthy();
  });

  it('guardar solo toca availability y preserva meet_link existente', async () => {
    const { baseElement } = await openGrid();
    // Activa Lunes 9:00 (primer botón de celda del grid)
    const cell = await firstCell(baseElement);
    fireEvent.click(cell);
    fireEvent.click(await saveButton(baseElement));
    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(db.lastUpdate).toHaveProperty('availability');
    // El spread conserva el valor existente de DB sin modificarlo
    expect(db.lastUpdate).toMatchObject({ meet_link: 'https://meet.google.com/abc-defg-hij' });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: '¡Listo!' }),
    );
  });

  it('guardar funciona sin link previo y no exige campo Meet', async () => {
    db.profile.meet_link = null as unknown as string;
    const { baseElement } = await openGrid();
    expect(screen.queryByText('Enlace de Google Meet')).toBeNull();
    const cell = await firstCell(baseElement);
    fireEvent.click(cell);
    fireEvent.click(await saveButton(baseElement));
    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(db.lastUpdate).toHaveProperty('availability');
    // Sin link previo: el valor existente (null) se conserva tal cual
    expect(db.lastUpdate).toMatchObject({ meet_link: null });
  });
});
