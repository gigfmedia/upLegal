import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RelatedLawyers, resolveRelatedContext } from '@/components/blog/RelatedLawyers';

// ---------------------------------------------------------------------------
// FASE 5.19 — RelatedLawyers conversión: framing contextual, booking
// primario, perfil secundario, eventos 5.13 intactos, sin datos inventados.
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useBookingPricing', () => ({
  useBookingPricing: () => ({ clientSurchargePercent: 0.1, pricingReady: true, pricingError: null }),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: () => {}, inView: true }),
}));

const trackEventMock = vi.fn();
vi.mock('@/lib/track', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

const apiLawyers = [
  {
    id: 'lawyer-1',
    user_id: 'user-1',
    first_name: 'Ana',
    last_name: 'Prueba Uno',
    specialties: ['Derecho Civil', 'Arriendos'],
    rating: 4.5,
    review_count: 0,
    location: 'Santiago',
    hourly_rate_clp: 45000,
    avatar_url: '',
    bio: 'Bio real de prueba.',
    verified: false,
    pjud_verified: true,
    experience_years: 0,
    created_at: '2026-01-01',
  },
  {
    id: 'lawyer-2',
    user_id: 'user-2',
    first_name: 'Luis',
    last_name: 'Prueba Dos',
    specialties: ['Derecho Civil'],
    rating: 5,
    review_count: 4,
    location: 'Santiago',
    hourly_rate_clp: 50000,
    avatar_url: '',
    bio: 'Otra bio real.',
    verified: true,
    pjud_verified: true,
    experience_years: 6,
    created_at: '2026-01-01',
  },
];

vi.mock('@/pages/api/search-lawyers', () => ({
  searchLawyers: () => Promise.resolve({ lawyers: apiLawyers }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderRelated(articleId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/blog/${articleId}`]}>
          <Routes>
            <Route
              path="/blog/:slug"
              element={<RelatedLawyers category="Derecho Civil" articleId={articleId} />}
            />
            <Route path="/abogado/*" element={<div>PROFILE-PAGE</div>} />
            <Route path="/booking/*" element={<div>BOOKING-PAGE</div>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function tracked(name: string) {
  return trackEventMock.mock.calls
    .map((c) => c[0])
    .filter((n: string) => n === name);
}

beforeEach(() => {
  trackEventMock.mockClear();
  (window as any).gtag = vi.fn();
});

afterEach(cleanup);

describe('FASE 5.19 contexto por artículo', () => {
  it('resuelve preguntas por slug sin nueva taxonomía', () => {
    expect(resolveRelatedContext('no-devuelven-garantia-arriendo-chile-2026').question).toBe(
      '¿No te devolvieron la garantía?'
    );
    expect(resolveRelatedContext('me-quieren-desalojar-que-hago-chile-2026').question).toBe(
      '¿Te están pidiendo dejar la propiedad?'
    );
    expect(resolveRelatedContext('reajuste-arriendo-ipc-chile-2026').question).toBe(
      '¿Tienes dudas sobre el reajuste de tu arriendo?'
    );
    expect(resolveRelatedContext('que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026').question).toBe(
      '¿Tienes un problema de arriendo sin contrato escrito?'
    );
  });

  it('fallback civil honesto para artículos no inmobiliarios', () => {
    const ctx = resolveRelatedContext('negligencia-medica-chile-2026');
    expect(ctx.question).toBeNull();
    expect(ctx.audience).toBe('civil');
  });

  it('renderiza heading contextual + fallback en DOM', async () => {
    renderRelated('no-devuelven-garantia-arriendo-chile-2026');
    expect(await screen.findByText('¿No te devolvieron la garantía?')).toBeTruthy();
    expect(screen.getByText(/revisar tu situación/)).toBeTruthy();
  });

  it('fallback civil muestra línea de Derecho Civil, sin "expertos"', async () => {
    renderRelated('negligencia-medica-chile-2026');
    expect(await screen.findByText('¿Necesitas revisar tu caso?')).toBeTruthy();
    expect(screen.getByText('Abogados disponibles para consultas de Derecho Civil')).toBeTruthy();
    expect(screen.queryByText(/Expertos en/i)).toBeNull();
  });
});

describe('FASE 5.19 routing y eventos intactos', () => {
  it('booking primario → /booking/:slug-:id + 1 booking event, sin profile', async () => {
    renderRelated('no-devuelven-garantia-arriendo-chile-2026');
    const btns = await screen.findAllByText('Agenda consulta →');
    fireEvent.click(btns[0]);
    expect(await screen.findByText('BOOKING-PAGE')).toBeTruthy();
    expect(tracked('related_lawyer_booking_clicked')).toHaveLength(1);
    expect(tracked('related_lawyer_profile_clicked')).toHaveLength(0);
    expect(screen.getByTestId('location').textContent).toMatch(/^\/booking\/.+-user-1/);
  });

  it('Ver perfil secundario → perfil + 1 profile event, sin booking', async () => {
    renderRelated('no-devuelven-garantia-arriendo-chile-2026');
    const links = await screen.findAllByText('Ver perfil');
    fireEvent.click(links[0]);
    expect(await screen.findByText('PROFILE-PAGE')).toBeTruthy();
    expect(tracked('related_lawyer_profile_clicked')).toHaveLength(1);
    expect(tracked('related_lawyer_booking_clicked')).toHaveLength(0);
  });

  it('click en card (foto/nombre) → perfil una vez', async () => {
    const { container } = renderRelated('no-devuelven-garantia-arriendo-chile-2026');
    await screen.findAllByText('Agenda consulta →');
    const card = container.querySelector('[class*="cursor-pointer"]');
    expect(card).toBeTruthy();
    act(() => {
      fireEvent.click(card!);
    });
    expect(await screen.findByText('PROFILE-PAGE')).toBeTruthy();
    expect(tracked('related_lawyer_profile_clicked')).toHaveLength(1);
  });

  it('shown tracking intacto con article_slug', async () => {
    renderRelated('no-devuelven-garantia-arriendo-chile-2026');
    await screen.findAllByText('Agenda consulta →');
    const shown = trackEventMock.mock.calls.filter((c) => c[0] === 'related_lawyers_shown');
    expect(shown.length).toBeGreaterThan(0);
    expect(
      shown.every((c) => (c[1] as any).article_slug === 'no-devuelven-garantia-arriendo-chile-2026')
    ).toBe(true);
    expect(
      shown.every((c) => (c[1] as any).source === 'related_lawyers')
    ).toBe(true);
  });
});

describe('FASE 5.19 sin datos inventados + estructura', () => {
  it('sin "Disponible hoy", sin "Respuesta hoy", sin "0 reseñas"', async () => {
    const { container } = renderRelated('no-devuelven-garantia-arriendo-chile-2026');
    await screen.findAllByText('Agenda consulta →');
    const text = container.textContent || '';
    expect(text).not.toContain('Disponible hoy');
    expect(text).not.toContain('Respuesta hoy');
    expect(text).not.toMatch(/0 reseñas/);
  });

  it('datos reales intactos: nombre, precio final, especialidad', async () => {
    const { container } = renderRelated('no-devuelven-garantia-arriendo-chile-2026');
    await screen.findAllByText('Agenda consulta →');
    const text = container.textContent || '';
    expect(text).toContain('Ana');
    expect(text).toContain('50.000');
    expect(text).toContain('Derecho Civil');
  });

  it('swipe mobile + grid desktop presentes', async () => {
    const { container } = renderRelated('no-devuelven-garantia-arriendo-chile-2026');
    await screen.findAllByText('Agenda consulta →');
    const track = container.querySelector('.overflow-x-auto');
    expect(track).toBeTruthy();
    expect(track!.className).toContain('snap-x');
    expect(track!.className).toContain('snap-mandatory');
    expect(track!.className).toContain('scrollbar-hide');
    expect(track!.className).toContain('sm:grid');
    const item = container.querySelector('.snap-center');
    expect(item).toBeTruthy();
    expect(item!.className).toContain('w-[82%]');
  });
});
