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
    const cat = category.toLowerCase();
    if (cat.includes('penal')) return 'Habla hoy con un abogado penal';
    if (cat.includes('laboral')) return 'Consulta tu caso con un abogado laboral';
    if (cat.includes('familia')) return 'Habla con un abogado de familia';
    if (cat.includes('arrendamiento') || cat.includes('arriendo')) return 'Revisa tu caso con un abogado especialista en arriendos';
    if (cat.includes('consumidor')) return 'Consulta con un abogado especialista';
    return 'Ver abogados disponibles';
  };

  return (
    <div ref={ref} className="my-10 p-8 border border-gray-200 bg-gray-50 rounded-2xl text-center shadow-sm">
      <h3 className="text-2xl font-bold font-serif text-gray-900 mb-2">{title || "¿Necesitas ayuda con este caso?"}</h3>
      <p className="text-gray-700 mb-4 font-medium">
        {message || `Habla con un abogado especialista en ${category}.`}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-5 justify-center">
        <div className="flex items-center gap-1.5 text-sm text-gray-600 justify-center">
          <span className="text-green-600">✓</span> Videollamada online
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600 justify-center">
          <span className="text-green-600">✓</span> Precio transparente
        </div>
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
