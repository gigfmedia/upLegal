import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface PreConclusionCTAProps {
  description: string;
  link: string;
  title?: string;
  buttonText?: string;
  category?: string;
}

const PreConclusionCTA: React.FC<PreConclusionCTAProps> = ({
  description,
  link,
  title = '¿Necesitas ayuda con tu caso?',
  buttonText = 'Comparar abogados especializados',
  category = 'General',
}) => {
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
    <div ref={ref} className="my-10 bg-green-900 rounded-xl p-6 sm:p-8 text-center">
      <h3 className="text-2xl font-bold text-green-600 mb-2 font-serif">{title}</h3>
      <p className="text-white mb-6">{description}</p>
      <Link
        to={link}
        className="inline-flex items-center gap-2 bg-white hover:border-white text-gray-900 font-bold px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
        onClick={handleCTA}
      >
        {buttonText}
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
};

export default PreConclusionCTA;

