import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

interface BlogConversionPopupProps {
  category?: string;
  topic?: 'finiquito' | 'despido' | 'arriendo' | string;
}

const BlogConversionPopup: React.FC<BlogConversionPopupProps> = ({ 
  category = "Derecho Laboral",
  topic
}) => {
  const [phase, setPhase] = useState<'hidden' | 'tension' | 'popup'>('hidden');
  const [hasDismissed, setHasDismissed] = useState(false);
  const [isExitingTension, setIsExitingTension] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const targetUrl = `/search?category=${encodeURIComponent(category)}`;

  // Content Mapping
  const getTopicContent = () => {
    switch(topic) {
      case 'finiquito':
        return {
          title: "¿No sabes si tu finiquito está bien calculado?",
          message: "Un abogado puede revisarlo contigo y decirte exactamente cuánto te corresponde.",
          priceLabel: "Abogados desde $30.000"
        };
      case 'despido':
        return {
          title: "¿Te despidieron y no sabes si fue legal?",
          message: "Habla con un abogado y entiende qué puedes hacer ahora.",
          priceLabel: "Abogados disponibles"
        };
      case 'arriendo':
        return {
          title: "¿Tienes dudas con tu contrato de arriendo?",
          message: "Un abogado puede revisar tu caso y proteger tus derechos.",
          priceLabel: "Consulta desde $30.000"
        };
      case 'contrato-arriendo':
        return {
          title: "¿Vas a firmar un contrato de arriendo?",
          message: "Un experto puede redactar o revisar tu contrato para evitar problemas legales a futuro.",
          priceLabel: "Desde $30.000"
        };
      case 'sin-contrato':
        return {
          title: "¿Tienes problemas con tu arriendo sin contrato?",
          message: "Un abogado puede orientarte según tu caso específico.",
          priceLabel: "Consulta desde $30.000"
        };
      case 'ipc':
        return {
          title: "¿Crees que el reajuste de tu arriendo es incorrecto?",
          message: "Un abogado puede calcular el monto exacto según el IPC oficial.",
          priceLabel: "Desde $30.000"
        };
      default:
        return {
          title: "¿Te está pasando esto ahora?",
          message: "Habla con un experto en minutos.",
          messageSub: "Conecta con un abogado disponible y resuelve tus dudas hoy.",
          priceLabel: "Desde $30.000"
        };
    }
  };

  const content = getTopicContent();

  // Resize detection isolated so it doesn't re-trigger the popup logic
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Popup trigger logic — runs once on mount, reads state via refs
  useEffect(() => {
    const status = sessionStorage.getItem('blog_popup_dismissed');
    if (status === 'true') {
      setHasDismissed(true);
      return;
    }

    let triggered = false;

    const triggerPhase = () => {
      if (triggered) return;
      triggered = true;
      setPhase('tension');
      setTimeout(() => {
        setIsExitingTension(true);
        setTimeout(() => {
          setPhase('popup');
          setIsExitingTension(false);
        }, 400);
      }, 5000);
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercentage = height > 0 ? (scrollY / height) * 100 : 0;

      if (scrollPercentage > 50) {
        triggerPhase();
        window.removeEventListener('scroll', handleScroll);
      }
    };

    const delay = window.innerWidth < 768 ? 40000 : 25000;
    const timer = setTimeout(triggerPhase, delay);

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setPhase('hidden');
    setHasDismissed(true);
    sessionStorage.setItem('blog_popup_dismissed', 'true');
  };

  if (phase === 'hidden' || hasDismissed) return null;

  return (
    <>
      {/* MOBILE UI - BOTTOM SHEET */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none px-0">
          {phase === 'tension' && (
            <div className={`
              mx-4 mb-4 bg-gray-900 text-white rounded-xl p-4 shadow-2xl border border-gray-800 
              animate-in slide-in-from-bottom-5 fade-in duration-700
              ${isExitingTension ? 'animate-out slide-out-to-bottom-5 fade-out duration-300' : 'animate-pulse-subtle'}
              pointer-events-auto text-center
            `}>
              <p className="text-sm font-medium leading-relaxed italic">
                "En muchos casos, estos detalles pueden cambiar completamente lo que te corresponde."
              </p>
            </div>
          )}

          {phase === 'popup' && (
            <div className="bg-white rounded-t-2xl p-5 pt-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] border-t border-gray-100 pointer-events-auto animate-in slide-in-from-bottom-full duration-500">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" onClick={handleDismiss} />
              
              <button 
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>

              <div className="flex flex-col items-center gap-2 text-center pb-2">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {content.title}
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                  {content.message}
                </p>

                <div className="w-full pt-2">
                  <Link to={targetUrl}>
                    <Button className="w-full bg-gray-900 hover:bg-green-900 text-white rounded-xl h-12 text-base font-bold shadow-md active:scale-95 transition-all">
                      Hablar con abogado ahora
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-4 mt-3 w-full">
                  {content.priceLabel && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      {content.priceLabel}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                    <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    Respuesta rápida
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DESKTOP UI - RIGHT FLOATING CARD */}
      {!isMobile && (
        <div className="fixed top-1/2 -translate-y-1/2 right-6 z-[100] max-w-xs w-[calc(100vw-3rem)] pointer-events-none">
          {phase === 'tension' && (
            <div className={`
              bg-gray-900 text-white rounded-xl p-5 shadow-2xl border border-gray-800 
              animate-in slide-in-from-right-10 fade-in duration-700
              ${isExitingTension ? 'animate-out slide-out-to-right-10 fade-out duration-300' : 'animate-pulse-subtle'}
              pointer-events-auto cursor-default
            `}>
              <p className="text-sm font-medium leading-relaxed italic text-center">
                "En muchos casos, estos detalles pueden cambiar completamente lo que te corresponde."
              </p>
            </div>
          )}

          {phase === 'popup' && (
            <div className="bg-white rounded-md shadow-2xl border border-gray-100 p-5 relative overflow-hidden backdrop-blur-sm bg-white/95 pointer-events-auto animate-in zoom-in-95 slide-in-from-right-5 fade-in duration-500">
              <button 
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>

              <div className="flex flex-col items-center gap-4 relative text-center">
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  {content.title}
                </h3>

                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  {content.message}
                  {content.messageSub && (
                    <>
                      <br/>
                      <span className="text-gray-400 font-normal italic">{content.messageSub}</span>
                    </>
                  )}
                </p>

                <div className="space-y-4 pt-1 w-full">
                  <Link to={targetUrl}>
                    <Button className="w-full bg-gray-900 hover:bg-green-900 text-white rounded-md h-12 text-sm font-bold shadow-md transition-all active:scale-95">
                      Hablar con abogado ahora
                    </Button>
                  </Link>

                  <div className="flex flex-col items-center gap-2 pt-1 w-full">
                    {content.priceLabel && (
                      <div className="flex items-center gap-1.5 text-[11px] text-center font-semibold text-gray-400">
                        <ShieldCheck className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        {content.priceLabel}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-center font-semibold text-gray-400">
                      <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      Respuesta rápida
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default BlogConversionPopup;
