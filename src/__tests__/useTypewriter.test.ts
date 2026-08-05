import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { typewriterDurationMs, useTypewriter } from '@/hooks/useTypewriter';

describe('useTypewriter', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calcula duración progresiva según la longitud', () => {
    expect(typewriterDurationMs(0)).toBe(0);
    expect(typewriterDurationMs(50)).toBe(900); // corto → mínimo
    expect(typewriterDurationMs(4000)).toBeLessThanOrEqual(4000); // largo → techo
  });

  it('revela el texto de forma progresiva y termina completo', () => {
    vi.useFakeTimers();
    const text = 'x'.repeat(1000);
    const { result, unmount } = renderHook(() => useTypewriter(text));

    expect(result.current.done).toBe(false);
    expect(result.current.text.length).toBeLessThan(text.length);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.text.length).toBeGreaterThan(0);
    expect(result.current.text.length).toBeLessThanOrEqual(text.length);

    act(() => {
      vi.advanceTimersByTime(typewriterDurationMs(text.length));
    });
    expect(result.current.done).toBe(true);
    expect(result.current.text).toBe(text);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('muestra el texto completo de inmediato si está deshabilitado', () => {
    vi.useFakeTimers();
    const text = 'abc';
    const { result, unmount } = renderHook(() => useTypewriter(text, { disabled: true }));
    expect(result.current.done).toBe(true);
    expect(result.current.text).toBe(text);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});