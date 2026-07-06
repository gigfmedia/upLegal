import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface InArticleCTAProps {
  category?: string;
  message?: string; // Keep for backward compatibility with old posts passing this
  buttonText?: string;
}

const InArticleCTA: React.FC<InArticleCTAProps> = ({ 
  category = "Derecho Laboral"
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

  return (
    <div ref={ref} className="my-10 p-6 border border-gray-100 bg-gray-50 rounded-xl text-left">
      <h3 className="text-lg font-bold text-gray-900 mb-2">¿Necesitas ayuda con este caso?</h3>
      <p className="text-gray-700 mb-4 font-medium">
        Habla con un abogado especialista en {category}.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <CheckCircle className="h-4 w-4 text-green-600" /> Videollamada online
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <CheckCircle className="h-4 w-4 text-green-600" /> Precio transparente
        </div>
      </div>

      <Link to={targetUrl} onClick={handleCTA} className="inline-block w-full sm:w-auto">
        <Button 
          className="bg-gray-900 hover:bg-green-900 text-white px-6 h-11 rounded-lg transition-all shadow-sm active:scale-95 w-full sm:w-auto font-bold"
        >
          Ver abogados disponibles
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
};

export default InArticleCTA;
