import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const DEFAULT_THINKING_STAGES = [
  'Pensando',
  'Analizando el documento',
  'Revisando el contexto del caso',
  'Preparando la respuesta',
];

const STAGE_MS = 2200;
const DOT_MS = 340;
const MAX_DOTS = 3;

type AIThinkingIndicatorProps = {
  stages?: string[];
};

/**
 * Indicador de "Pensando…" del chat de LegalUp AI.
 * Sin spinner: rota frases de progreso con una animación de puntos (Framer Motion).
 * El icono de sparkles y su círculo tienen una "respiración" lenta y sutil (CSS
 * keyframes 0%/50%/100% = loop perfecto, sin cortes): los sparkles se aclaran y
 * escalan suavemente, y el círculo emite un pulso de brillo verde difuso. Sin
 * partículas, morfamos ni efectos extra. Ocupa un espacio estable para no generar
 * saltos de layout y respeta prefers-reduced-motion (sin animación).
 * Todos los timers se limpian al desmontar.
 */
export function AIThinkingIndicator({ stages = DEFAULT_THINKING_STAGES }: AIThinkingIndicatorProps) {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setStage((s) => (s + 1) % stages.length), STAGE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, stages.length]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setDots((d) => (d + 1) % (MAX_DOTS + 1)), DOT_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  const label = `${stages[stage]}${'.'.repeat(dots)}`;

  return (
    <div
      className="flex min-h-[40px] items-center gap-3"
      role="status"
      aria-live="polite"
      aria-label="LegalUp AI está analizando la pregunta"
    >
      {!reducedMotion && (
        <span
          className="ai-thinking-glow inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
          aria-hidden="true"
        >
          <span className="ai-thinking-sparkle inline-flex" aria-hidden="true">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
        </span>
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
