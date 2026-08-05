import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const THINKING_STAGES = [
  'Pensando',
  'Analizando el documento',
  'Revisando el contexto del caso',
  'Preparando la respuesta',
];

const STAGE_MS = 2200;
const DOT_MS = 340;
const MAX_DOTS = 3;

/**
 * Indicador de "Pensando…" del chat de LegalUp AI.
 * Sin spinner: rota frases de progreso con una animación de puntos (Framer Motion).
 * Ocupa un espacio estable para no generar saltos de layout y respeta
 * prefers-reduced-motion. Todos los timers se limpian al desmontar.
 */
export function AIThinkingIndicator() {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setStage((s) => (s + 1) % THINKING_STAGES.length), STAGE_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setDots((d) => (d + 1) % (MAX_DOTS + 1)), DOT_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  const label = `${THINKING_STAGES[stage]}${'.'.repeat(dots)}`;

  return (
    <div
      className="flex min-h-[40px] items-center gap-3"
      role="status"
      aria-live="polite"
      aria-label="LegalUp AI está analizando la pregunta"
    >
      {!reducedMotion && (
        <motion.span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </motion.span>
      )}
      <div className="h-5 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="whitespace-nowrap text-sm text-muted-foreground"
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
