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
    return 'Hablar con un abogado';
  };

  return (
    <div ref={ref} className="my-10 p-8 border border-gray-200 bg-sand-900 rounded-2xl text-center shadow-sm">
      <h3 className="text-2xl font-bold font-serif text-green-900 mb-2">{title || "¿Necesitas resolver este problema hoy?"}</h3>
      <p className="text-gray-700 mb-4 font-medium">
        {message || "Un abogado puede revisar tu caso hoy mismo."}
      </p>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 justify-center">
        <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> Respuesta hoy</span>
        <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> Consulta online</span>
        <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> 60 minutos</span>
        <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> Precio fijo</span>
      </div>

      <Link to={targetUrl} onClick={handleCTA} className="inline-block w-full sm:w-auto">
        <Button
          className="bg-gray-900 hover:bg-green-900 text-white px-6 h-11 rounded-lg transition-all shadow-sm active:scale-95 w-full sm:w-auto font-bold"
        >
          {getButtonText()}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
};

export default InArticleCTA;
