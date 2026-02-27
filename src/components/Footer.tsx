import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const Footer = () => {
  const location = useLocation();
  const [isFeaturedSectionVisible, setIsFeaturedSectionVisible] = useState(false);
  const featuredSectionRef = useRef<HTMLElement>(null);
  
  // Set up intersection observer for the featured lawyers section
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.target.id === 'abogados-destacados') {
          // Usamos un umbral más alto para evitar parpadeos
          const isVisible = entry.intersectionRatio > 0.1;
          
          // Usar un timeout para agrupar actualizaciones rápidas
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setIsFeaturedSectionVisible(isVisible);
          }, 50); // Pequeño retraso para agrupar actualizaciones
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '0px',
      threshold: [0.1, 0.5, 0.8] // Umbrales más espaciados
    });

    // Usar requestAnimationFrame para optimizar el scroll
    const handleScroll = () => {
      lastScrollY = window.scrollY;
      
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const featuredSection = document.getElementById('abogados-destacados');
          if (featuredSection) {
            const rect = featuredSection.getBoundingClientRect();
            // Ajustado para que se oculte antes de llegar al botón 'Ver todos'
            const isInView = (
              rect.top <= window.innerHeight * 0.9 && 
              rect.bottom >= window.innerHeight * 0.1
            );
            
            // Solo actualizar el estado si hay un cambio real
            setIsFeaturedSectionVisible(prev => {
              if (prev !== isInView) {
                return isInView;
              }
              return prev;
            });
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    // Usar un pequeño retraso para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      const featuredSection = document.getElementById('abogados-destacados');
      
      if (featuredSection) {
        observer.observe(featuredSection);
        // Verificación inicial más precisa
        const rect = featuredSection.getBoundingClientRect();
        // Ajustado para que se oculte antes de llegar al botón 'Ver todos'
        const isInView = (
          rect.top <= window.innerHeight * 0.9 && 
          rect.bottom >= window.innerHeight * 0.1
        );
        setIsFeaturedSectionVisible(isInView);
      } else {
        console.warn('No se encontró la sección de abogados destacados');
      }
      
      // Agregar el event listener después de la verificación inicial
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 200);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeoutId);
      const featuredSection = document.getElementById('abogados-destacados');
      if (featuredSection) {
        observer.unobserve(featuredSection);
      }
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="relative">
      {/* WhatsApp Button - Fixed at bottom right */}
      <div className="fixed bottom-6 right-6 z-50 group">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 w-max max-w-[200px] bg-[#101820] text-white text-xs py-2 px-3 rounded-lg shadow-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-0 md:translate-y-2 md:group-hover:translate-y-0">
          <h3>¿No sabes qué abogado elegir? Te ayudamos</h3>
          {/* Tooltip arrow */}
          <div className="absolute top-full right-5 -mt-1 border-4 border-transparent border-t-[#101820]"></div>
        </div>
        
        <a 
          href="https://wa.me/56950913358?text=Hola,%20necesito%20ayuda%20con%20una%20consulta%20legal" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="bg-[#ffffff] text-black-900 hover:text-white border-2 border-solid p-3 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        >
          <svg fill="#25D366" width="28px" height="28px" viewBox="-2 -2 24 24" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin"><path d='M9.516.012C4.206.262.017 4.652.033 9.929a9.798 9.798 0 0 0 1.085 4.465L.06 19.495a.387.387 0 0 0 .47.453l5.034-1.184a9.981 9.981 0 0 0 4.284 1.032c5.427.083 9.951-4.195 10.12-9.58C20.15 4.441 15.351-.265 9.516.011zm6.007 15.367a7.784 7.784 0 0 1-5.52 2.27 7.77 7.77 0 0 1-3.474-.808l-.701-.347-3.087.726.65-3.131-.346-.672A7.62 7.62 0 0 1 2.197 9.9c0-2.07.812-4.017 2.286-5.48a7.85 7.85 0 0 1 5.52-2.271c2.086 0 4.046.806 5.52 2.27a7.672 7.672 0 0 1 2.287 5.48c0 2.052-.825 4.03-2.287 5.481z'/><path d='M14.842 12.045l-1.931-.55a.723.723 0 0 0-.713.186l-.472.478a.707.707 0 0 1-.765.16c-.913-.367-2.835-2.063-3.326-2.912a.694.694 0 0 1 .056-.774l.412-.53a.71.71 0 0 0 .089-.726L7.38 5.553a.723.723 0 0 0-1.125-.256c-.539.453-1.179 1.14-1.256 1.903-.137 1.343.443 3.036 2.637 5.07 2.535 2.349 4.566 2.66 5.887 2.341.75-.18 1.35-.903 1.727-1.494a.713.713 0 0 0-.408-1.072z'/></svg>
        </a>
      </div>
    
      <footer className="bg-muted border-t border-border relative z-10">
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">

            {/* Copy */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>© 2026 LegalUp. Todos los derechos reservados.</span>
            </div>

            {/* Middle links */}
            <div className="flex items-center space-x-6 text-sm">
              <a 
                href="/search" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Buscar abogados
              </a>

              <Link 
                to="/terminos" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Términos de Servicio
              </Link>

              <Link 
                to="/privacidad" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Política de Privacidad
              </Link>

              <a 
                href="/contacto" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contacto
              </a>
            </div>

            {/* Redes sociales */}
            <div className="flex items-center space-x-4">
              <a 
                href="https://www.instagram.com/legalupcl" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Instagram LegalUp"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg fill="currentColor" width="20px" height="20px" viewBox="0 0 24 24"><title>Instagram icon</title>
                  <path d="M17.34,5.46h0a1.2,1.2,0,1,0,1.2,1.2A1.2,1.2,0,0,0,17.34,5.46Zm4.6,2.42a7.59,7.59,0,0,0-.46-2.43,4.94,4.94,0,0,0-1.16-1.77,4.7,4.7,0,0,0-1.77-1.15,7.3,7.3,0,0,0-2.43-.47C15.06,2,14.72,2,12,2s-3.06,0-4.12.06a7.3,7.3,0,0,0-2.43.47A4.78,4.78,0,0,0,3.68,3.68,4.7,4.7,0,0,0,2.53,5.45a7.3,7.3,0,0,0-.47,2.43C2,8.94,2,9.28,2,12s0,3.06.06,4.12a7.3,7.3,0,0,0,.47,2.43,4.7,4.7,0,0,0,1.15,1.77,4.78,4.78,0,0,0,1.77,1.15,7.3,7.3,0,0,0,2.43.47C8.94,22,9.28,22,12,22s3.06,0,4.12-.06a7.3,7.3,0,0,0,2.43-.47,4.7,4.7,0,0,0,1.77-1.15,4.85,4.85,0,0,0,1.16-1.77,7.59,7.59,0,0,0,.46-2.43c0-1.06.06-1.4.06-4.12S22,8.94,21.94,7.88ZM20.14,16a5.61,5.61,0,0,1-.34,1.86,3.06,3.06,0,0,1-.75,1.15,3.19,3.19,0,0,1-1.15.75,5.61,5.61,0,0,1-1.86.34c-1,.05-1.37.06-4,.06s-3,0-4-.06A5.73,5.73,0,0,1,6.1,19.8,3.27,3.27,0,0,1,5,19.05a3,3,0,0,1-.74-1.15A5.54,5.54,0,0,1,3.86,16c0-1-.06-1.37-.06-4s0-3,.06-4A5.54,5.54,0,0,1,4.21,6.1,3,3,0,0,1,5,5,3.14,3.14,0,0,1,6.1,4.2,5.73,5.73,0,0,1,8,3.86c1,0,1.37-.06,4-.06s3,0,4,.06a5.61,5.61,0,0,1,1.86.34A3.06,3.06,0,0,1,19.05,5,3.06,3.06,0,0,1,19.8,6.1,5.61,5.61,0,0,1,20.14,8c.05,1,.06,1.37.06,4S20.19,15,20.14,16ZM12,6.87A5.13,5.13,0,1,0,17.14,12,5.12,5.12,0,0,0,12,6.87Zm0,8.46A3.33,3.33,0,1,1,15.33,12,3.33,3.33,0,0,1,12,15.33Z"/></svg>
              </a>

              <a 
                href="https://www.tiktok.com/@legalupcl" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Tiktok LegalUp"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg 
                  width="16px" 
                  height="16px"
                  fill="currentColor"
                  viewBox="0 0 24 24" 
                ><title>TikTok icon</title>
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;