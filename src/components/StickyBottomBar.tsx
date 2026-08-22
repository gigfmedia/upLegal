import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useStickyBottomBar } from '@/contexts/StickyBottomBarContext';

interface StickyBottomBarProps {
  /** Precio de la consulta en formato CLP */
  price: string;
  /** Duración de la consulta (ej: "Consulta 60 min") */
  duration: string;
  /** ID del elemento a observar (bloque de experiencia) */
  targetId: string;
  /** Callback cuando se hace click en el botón de agendar */
  onBookClick: () => void;
  /** Indica si el botón debe estar deshabilitado */
  disabled?: boolean;
}

/**
 * StickyBottomBar - Barra inferior fija que aparece al hacer scroll
 * 
 * Usa IntersectionObserver para detectar cuando el bloque de experiencia
 * deja de ser visible y muestra la barra con animación suave.
 */
export function StickyBottomBar({
  price,
  duration,
  targetId,
  onBookClick,
  disabled = false,
}: StickyBottomBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const { setIsVisible: setContextVisible } = useStickyBottomBar();

  useEffect(() => {
    // Configurar IntersectionObserver para el bloque de experiencia
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Mostrar barra cuando el elemento deja de ser visible (isIntersecting === false)
        const visible = !entry.isIntersecting;
        setIsVisible(visible);
        setContextVisible(visible);
      },
      {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0, // disparar cuando cualquier parte del elemento sale/entra
      }
    );

    observerRef.current.observe(targetElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [targetId, setContextVisible]);

  // Siempre renderizar el componente para permitir animación de salida
  return (
    <div
      ref={barRef}
      className={`fixed bottom-0 left-0 right-0 z-[1100] bg-white border-t border-gray-200 shadow-lg transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      role="banner"
      aria-label="Barra de agendamiento rápido"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Precio y duración - izquierda */}
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900">
              {price}
            </span>
            <span className="text-xs text-gray-600">
              {duration}
            </span>
          </div>

          {/* Botón de agendar - derecha */}
          <Button
            onClick={onBookClick}
            disabled={disabled}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 min-w-[160px] justify-center"
            aria-label="Agenda consulta"
          >
            <Calendar className="h-4 w-4" />
            <span>Agenda consulta</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
