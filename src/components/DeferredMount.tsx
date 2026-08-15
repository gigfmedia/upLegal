import { useEffect, useState, type ReactNode } from 'react';

const scheduleWhenIdle = (callback: () => void): void => {
  const win = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(callback, { timeout: 3000 });
  } else {
    window.setTimeout(callback, 3000);
  }
};

export function DeferredMount({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    scheduleWhenIdle(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) return null;
  return <>{children}</>;
}