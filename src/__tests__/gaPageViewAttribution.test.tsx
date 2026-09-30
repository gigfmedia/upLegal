import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import GoogleAnalytics from '@/components/GoogleAnalytics';

// ---------------------------------------------------------------------------
// FASE 5.18A — el page_view manual debe llevar el título FINAL de Helmet,
// uno por navegación, sin duplicados ni metadata stale.
// ---------------------------------------------------------------------------

vi.mock('@/lib/cookieConsent', () => ({
  getStoredConsent: () => (globalThis as any).__gaConsent ?? { analytics: true },
  subscribeConsent: () => () => {},
}));

vi.mock('@/lib/consentTrackers', () => ({
  ensureGa4Loaded: () => {},
  disableGa4: () => {},
}));

type GtagCall = unknown[];
let gtagCalls: GtagCall[];
let rafQueue: FrameRequestCallback[];

function flushRaf() {
  act(() => {
    let guard = 0;
    while (rafQueue.length && guard++ < 500) {
      const cbs = rafQueue.splice(0);
      cbs.forEach((cb) => cb(0));
    }
  });
}

async function flushObserver() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function Page({ title, body }: { title: string; body: string }) {
  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <div>{body}</div>
    </>
  );
}

function Navigator() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate('/')}>go-home</button>
      <button onClick={() => navigate('/blog/a')}>go-a</button>
      <button onClick={() => navigate('/blog/b')}>go-b</button>
      <button onClick={() => navigate('/abogado-arriendo')}>go-arriendo</button>
    </>
  );
}

function App({ initial }: { initial: string }) {
  return (
    <HelmetProvider>
      <MemoryRouter initialEntries={[initial]}>
        <GoogleAnalytics />
        <Routes>
          <Route path="/" element={<Page title="LegalUp Home Title" body="home" />} />
          <Route path="/blog/a" element={<Page title="Article A Full Title" body="a" />} />
          <Route path="/blog/b" element={<Page title="Article B Full Title" body="b" />} />
          <Route
            path="/abogado-arriendo"
            element={<Page title="Arriendo Landing Title" body="arriendo" />}
          />
        </Routes>
        <Navigator />
      </MemoryRouter>
    </HelmetProvider>
  );
}

function pageViews() {
  return gtagCalls.filter((c) => c[1] === 'page_view');
}

function payload(i: number) {
  return pageViews()[i][2] as Record<string, unknown>;
}

beforeEach(() => {
  gtagCalls = [];
  rafQueue = [];
  (globalThis as any).__gaConsent = { analytics: true };
  (window as any).gtag = (...args: unknown[]) => {
    gtagCalls.push(args);
  };
  (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  document.title = 'Shell Title';
});

afterEach(() => {
  cleanup();
});

describe('FASE 5.18A page_view con título final', () => {
  it('HOME→ARTICLE: un solo page_view con título y path del artículo', () => {
    const { getByText } = render(<App initial="/" />);
    flushRaf();
    expect(pageViews()).toHaveLength(1);
    expect(payload(0)).toMatchObject({ page_title: 'LegalUp Home Title', page_path: '/' });
    act(() => {
      getByText('go-b').click();
    });
    flushRaf();
    expect(pageViews()).toHaveLength(2);
    expect(payload(1)).toMatchObject({ page_title: 'Article B Full Title', page_path: '/blog/b' });
  });

  it('ARTICLE A→ARTICLE B: emite B, nunca metadata stale de A', () => {
    const { getByText } = render(<App initial="/blog/a" />);
    flushRaf();
    expect(pageViews()).toHaveLength(1);
    expect(payload(0).page_title).toBe('Article A Full Title');
    act(() => {
      getByText('go-b').click();
    });
    flushRaf();
    expect(pageViews()).toHaveLength(2);
    expect(payload(1)).toMatchObject({ page_title: 'Article B Full Title', page_path: '/blog/b' });
  });

  it('ARTICLE→HOME: emite metadata del home', () => {
    const { getByText } = render(<App initial="/blog/a" />);
    flushRaf();
    act(() => {
      getByText('go-home').click();
    });
    flushRaf();
    expect(pageViews()).toHaveLength(2);
    expect(payload(1)).toMatchObject({ page_title: 'LegalUp Home Title', page_path: '/' });
  });

  it('navegación rápida A→B→arriendo sin flush: solo el destino final, una vez', () => {
    const { getByText } = render(<App initial="/" />);
    flushRaf();
    expect(pageViews()).toHaveLength(1);
    act(() => {
      getByText('go-a').click();
      getByText('go-b').click();
      getByText('go-arriendo').click();
    });
    flushRaf();
    expect(pageViews()).toHaveLength(2);
    expect(payload(1)).toMatchObject({
      page_title: 'Arriendo Landing Title',
      page_path: '/abogado-arriendo',
    });
  });

  it('re-render en la misma ruta no duplica page_view', () => {
    const { rerender } = render(<App initial="/" />);
    flushRaf();
    expect(pageViews()).toHaveLength(1);
    rerender(<App initial="/" />);
    flushRaf();
    expect(pageViews()).toHaveLength(1);
  });

  it('título tardío (chunk lazy): el observer envía el título final, no el intermedio', async () => {
    const { getByText } = render(<App initial="/" />);
    flushRaf();
    expect(pageViews()).toHaveLength(1);
    act(() => {
      getByText('go-b').click();
    });
    // Simula Helmet tardío: el título conmuta DESPUÉS de la navegación
    document.title = 'Still Old Title';
    await act(async () => {
      document.title = 'Article B Full Title';
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(pageViews()).toHaveLength(2);
    expect(payload(1)).toMatchObject({ page_title: 'Article B Full Title', page_path: '/blog/b' });
  });

  it('títulos idénticos entre rutas: el fallback acotado envía una vez', () => {
    function SameTitleApp() {
      return (
        <HelmetProvider>
          <MemoryRouter initialEntries={['/blog/a']}>
            <GoogleAnalytics />
            <Routes>
              <Route path="/blog/a" element={<Page title="Same Title" body="a" />} />
              <Route path="/blog/b" element={<Page title="Same Title" body="b" />} />
            </Routes>
            <Navigator />
          </MemoryRouter>
        </HelmetProvider>
      );
    }
    const { getByText } = render(<SameTitleApp />);
    flushRaf();
    expect(pageViews()).toHaveLength(1);
    act(() => {
      getByText('go-b').click();
    });
    flushRaf(); // agota el fallback de frames
    expect(pageViews()).toHaveLength(2);
    expect(payload(1)).toMatchObject({ page_title: 'Same Title', page_path: '/blog/b' });
  });

  it('sin consentimiento analytics no hay page_view', () => {
    (globalThis as any).__gaConsent = {};
    render(<App initial="/" />);
    flushRaf();
    expect(pageViews()).toHaveLength(0);
  });
});
