import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useInView } from 'react-intersection-observer';
import { trackEvent } from '@/lib/track';

const DESTINATION = '/abogado-arriendo';
const SOURCE = 'ipc_review_block';

/**
 * FASE 5.20B — bloque de revisión jurídica post-calculadora (solo artículo
 * reajuste-ipc). Propuesta concreta de revisión, sin prometer resultados ni
 * degradar la calculadora. Eventos propios con source específico para no
 * atribuirle clics de otros CTA.
 */
export function IpcReviewCTA() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 });

  useEffect(() => {
    if (!inView || typeof window === 'undefined') return;
    const pagePath = window.location.pathname;
    trackEvent('ipc_review_block_shown', {
      article_slug: pagePath.split('/').pop() || '',
      source: SOURCE,
      destination: DESTINATION,
      page_path: pagePath,
    });
  }, [inView]);

  const handleClick = () => {
    try {
      sessionStorage.setItem('has_commercial_intent', 'true');
    } catch {}
    if (typeof window === 'undefined') return;
    const pagePath = window.location.pathname;
    trackEvent('ipc_review_block_clicked', {
      article_slug: pagePath.split('/').pop() || '',
      source: SOURCE,
      destination: DESTINATION,
      page_path: pagePath,
    });
  };

  return (
    <div ref={ref} className="my-10 rounded-2xl border border-green-200 bg-green-50/60 p-6 sm:p-8">
      <h3 className="text-xl font-bold text-gray-900">
        ¿Quieres comprobar si el reajuste corresponde en tu contrato?
      </h3>
      <p className="mt-2 text-gray-600 leading-relaxed">
        El cálculo por sí solo no confirma que el monto sea correcto. Conviene revisar
        la cláusula de reajuste, el período del IPC utilizado y las fechas pactadas
        antes de aplicarlo.
      </p>
      <p className="mt-4 text-sm font-semibold text-gray-900">
        Qué se puede revisar en una consulta:
      </p>
      <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
        <li className="flex items-start gap-2">
          <span className="text-green-700 font-bold" aria-hidden="true">✓</span>
          La cláusula y la periodicidad acordada.
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-700 font-bold" aria-hidden="true">✓</span>
          El período del IPC que corresponde utilizar.
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-700 font-bold" aria-hidden="true">✓</span>
          El monto calculado y su aplicación al contrato.
        </li>
      </ul>
      <Link to={DESTINATION} onClick={handleClick} className="mt-5 inline-block w-full sm:w-auto">
        <Button className="bg-green-900 hover:bg-green-700 text-white px-8 h-12 rounded-lg font-bold text-base w-full sm:w-auto">
          Consultar por mi reajuste de arriendo →
        </Button>
      </Link>
    </div>
  );
}
