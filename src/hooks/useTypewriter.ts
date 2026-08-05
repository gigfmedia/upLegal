import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const MIN_REVEAL_MS = 900;
const MAX_REVEAL_MS = 4000;
const TICK_MS = 16;
const CHARS_PER_MS = 0.07;

/** Duración total del efecto de escritura según la longitud del texto. */
export function typewriterDurationMs(length: number): number {
  if (length <= 0) return 0;
  if (length <= 200) return MIN_REVEAL_MS;
  return Math.min(MAX_REVEAL_MS, Math.round(length / CHARS_PER_MS));
}

type TypewriterOptions = { disabled?: boolean };

/**
 * Efecto de escritura progresiva para la respuesta del asistente.
 * El backend devuelve la respuesta completa; el frontend la revela poco a poco.
 * - Responde a prefers-reduced-motion (texto completo de inmediato).
 * - Limpia el intervalo al desmontar y cuando el texto cambia.
 * - `disabled` fuerza revelado inmediato (útil en tests o contextos sin animación).
 */
export function useTypewriter(text: string, options: TypewriterOptions = {}) {
  const reducedMotion = useReducedMotion();
  const { disabled = false } = options;
  const [count, setCount] = useState(() =>
    disabled || reducedMotion ? text.length : 0
  );

  useEffect(() => {
    if (disabled || reducedMotion) {
      setCount(text.length);
      return;
    }

    setCount(0);
    const duration = typewriterDurationMs(text.length);
    if (duration === 0) return;

    const chunk = Math.max(1, Math.ceil(text.length / (duration / TICK_MS)));

    const id = setInterval(() => {
      setCount((prev) => {
        const next = prev + chunk;
        if (next >= text.length) {
          clearInterval(id);
          return text.length;
        }
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [text, reducedMotion, disabled]);

  return {
    text: text.slice(0, count),
    done: count >= text.length,
    durationMs: disabled || reducedMotion ? 0 : typewriterDurationMs(text.length),
  };
}
