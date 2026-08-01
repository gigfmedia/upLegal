import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface InArticleCTAProps {
  category?: string;
  message?: string;
  buttonText?: string;
  title?: string;
}

const InArticleCTA: React.FC<InArticleCTAProps> = ({
  category = "Derecho Laboral",
  message,
  buttonText,
  title,
}) => {
  const DEFAULT_TITLE = "¿Necesitas resolver tu situación?";
  const DEFAULT_MESSAGE = "Un abogado puede analizar tu caso y orientarte sobre las alternativas disponibles.";
  const DEFAULT_BUTTON = "Consultar con un abogado";
  const targetUrl = `/search?specialty=${encodeURIComponent(category)}`;

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  useEffect(() => {
    if (inView) {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'blog_inline_cta_shown', { specialty: category });
      }
    }
  }, [inView, category]);

  const handleCTA = () => {
    sessionStorage.setItem('has_commercial_intent', 'true');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'blog_inline_cta_clicked', { specialty: category });
    }
  };

  const getButtonText = () => {
    if (buttonText) return buttonText;
    return DEFAULT_BUTTON;
  };

  return (
    <div ref={ref} className="my-10 p-8 border border-gray-200 bg-cream-900 rounded-2xl text-center shadow-sm">
      <h3 className="text-2xl font-bold font-serif text-green-900 mb-2">{title || DEFAULT_TITLE}</h3>
      <p className="text-green-900 mb-4">
        {message || DEFAULT_MESSAGE}
      </p>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 justify-center">
        <span className="flex items-center gap-1.5 text-sm text-green-900"><span className="text-green-600 font-bold">✓</span> Respuesta hoy</span>
        <span className="flex items-center gap-1.5 text-sm text-green-900"><span className="text-green-600 font-bold">✓</span> Consulta online</span>
        <span className="flex items-center gap-1.5 text-sm text-green-900"><span className="text-green-600 font-bold">✓</span> 60 minutos</span>
        <span className="flex items-center gap-1.5 text-sm text-green-900"><span className="text-green-600 font-bold">✓</span> Precio fijo</span>
      </div>

      <Link to={targetUrl} onClick={handleCTA} className="inline-block w-full sm:w-auto">
        <Button
          className="bg-green-900 hover:bg-green-700 text-white px-8 h-12 rounded-lg transition-all shadow-md active:scale-95 w-full sm:w-auto font-bold text-base"
        >
          {getButtonText()} →
        </Button>
      </Link>
    </div>
  );
};

export default InArticleCTA;
