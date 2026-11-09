import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import LegalUpServices from '@/pages/LegalUpServices';

let observerCallback: IntersectionObserverCallback | undefined;

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
}

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  return {
    useReducedMotion: () => true,
    motion: new Proxy({}, {
      get: (_, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, React.forwardRef(({ children, ...props }: Record<string, unknown>, ref) => {
            for (const key of ['initial', 'animate', 'transition', 'viewport', 'whileInView', 'whileHover', 'whileTap']) delete props[key];
            return React.createElement(tag, { ...props, ref }, children as React.ReactNode);
          }));
        }
        return cache.get(tag);
      },
    }),
  };
});

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <LegalUpServices />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function setFooterVisible(isIntersecting: boolean) {
  act(() => {
    observerCallback?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

describe('LegalUpServices mobile CTA', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    observerCallback = undefined;
  });

  it('hides the fixed CTA when the footer becomes visible and restores it when leaving', () => {
    renderPage();

    expect(screen.getByTestId('mobile-services-cta')).toBeInTheDocument();

    setFooterVisible(true);
    expect(screen.queryByTestId('mobile-services-cta')).not.toBeInTheDocument();

    setFooterVisible(false);
    expect(screen.getByTestId('mobile-services-cta')).toBeInTheDocument();
  });
});
