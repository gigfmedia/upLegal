import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BlogConversionPopupProps {
  category?: string;
  topic?: string;
}

const BlogConversionPopup: React.FC<BlogConversionPopupProps> = ({ 
  category = "Derecho Laboral",
  topic
}) => {
  const [phase, setPhase] = useState<'hidden' | 'popup'>('hidden');
  const [hasDismissed, setHasDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const targetUrl = `/search?specialty=${encodeURIComponent(category)}`;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('blog_popup_dismissed') === 'true') {
      setHasDismissed(true);
      return;
    }

    if (sessionStorage.getItem('has_commercial_intent') === 'true') {
      setHasDismissed(true);
      return;
    }

    let triggered = false;
    const startTime = Date.now();

    const triggerPhase = () => {
      if (triggered) return;
      
      if (sessionStorage.getItem('has_commercial_intent') === 'true') return;

      triggered = true;
      setPhase('popup');
      
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'blog_popup_shown', { specialty: category });
      }
    };

    const handleScroll = () => {
      if (triggered) return;

      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercentage = height > 0 ? (scrollY / height) * 100 : 0;
      
      const timeElapsedSecs = (Date.now() - startTime) / 1000;

      if (scrollPercentage > 70 || (timeElapsedSecs > 45 && scrollPercentage > 40)) {
        triggerPhase();
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll);

    const interval = setInterval(() => {
      if (!triggered) {
         handleScroll();
      } else {
         clearInterval(interval);
      }
    }, 2000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, [category]);

  const handleDismiss = () => {
    setPhase('hidden');
    setHasDismissed(true);
    sessionStorage.setItem('blog_popup_dismissed', 'true');
  };

  const handleCTA = () => {
    sessionStorage.setItem('has_commercial_intent', 'true');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'blog_popup_clicked', { specialty: category });
    }
  };

  if (phase === 'hidden' || hasDismissed) return null;

  const content = {
    title: "¿Necesitas resolver este problema?",
    message: `Habla hoy con un abogado especialista en ${category}.`,
  };

  return (
    <>
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none px-0">
          <div className="bg-white rounded-t-2xl p-5 pt-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] border-t border-gray-100 pointer-events-auto animate-in slide-in-from-bottom-full duration-500">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 cursor-pointer" onClick={handleDismiss} />
            
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>

            <div className="flex flex-col items-start gap-3 pb-2 text-left">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {content.title}
              </h3>

              <p className="text-sm text-gray-800 leading-relaxed font-medium">
                {content.message}
              </p>
              
              <ul className="text-xs text-gray-600 space-y-1 mb-2">
                <li className="flex items-center gap-1.5"><span className="text-green-600">✓</span> Videollamada online</li>
                <li className="flex items-center gap-1.5"><span className="text-green-600">✓</span> Precio transparente</li>
                <li className="flex items-center gap-1.5"><span className="text-green-600">✓</span> Agenda inmediata</li>
              </ul>

              <div className="w-full">
                <Link to={targetUrl} onClick={handleCTA}>
                  <Button className="w-full bg-gray-900 hover:bg-green-900 text-white rounded-xl h-12 text-base font-bold shadow-md active:scale-95 transition-all">
                    Agendar con un abogado
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-[340px] w-full pointer-events-none">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 relative overflow-hidden backdrop-blur-sm bg-white/95 pointer-events-auto animate-in zoom-in-95 slide-in-from-right-5 fade-in duration-500">
            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors z-10"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>

            <div className="flex flex-col items-start gap-3 relative text-left">
              <h3 className="text-lg font-bold text-gray-900 leading-tight pr-6">
                {content.title}
              </h3>

              <p className="text-sm text-gray-800 font-medium leading-relaxed">
                {content.message}
              </p>
              
              <ul className="text-sm text-gray-600 space-y-1.5 mb-2">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Videollamada online</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Precio transparente</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Agenda inmediata</li>
              </ul>

              <div className="w-full pt-2">
                <Link to={targetUrl} onClick={handleCTA}>
                  <Button className="w-full bg-gray-900 hover:bg-green-900 text-white rounded-lg h-12 text-sm font-bold shadow-md transition-all active:scale-95">
                    Agendar con un abogado
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlogConversionPopup;
