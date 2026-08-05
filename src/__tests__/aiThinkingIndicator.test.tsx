import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AIThinkingIndicator } from '@/components/legalup-ai/AIThinkingIndicator';

describe('AIThinkingIndicator', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('muestra un estado de pensamiento con rol de status y texto inicial', () => {
    vi.useFakeTimers();
    const { unmount } = render(<AIThinkingIndicator />);
    const status = screen.getByRole('status');
    expect(status).toBeTruthy();
    expect(status.getAttribute('aria-live')).toBe('polite');
    // Primer stage visible: "Pensando".
    expect(screen.getByText(/Pensando/)).toBeTruthy();
    unmount();
  });

  it('limpia los intervalos al desmontar', () => {
    vi.useFakeTimers();
    const { unmount } = render(<AIThinkingIndicator />);
    unmount();
    // Si quedaran intervalos vivos, quedarían timers pendientes.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('no deja intervalos activos tras desmontar con fake timers', () => {
    vi.useFakeTimers();
    const { unmount } = render(<AIThinkingIndicator />);
    act(() => {
      vi.advanceTimersByTime(10000); // varios ciclos de stage
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

