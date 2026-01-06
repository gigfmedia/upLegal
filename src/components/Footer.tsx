import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <div className="relative">
      {/* WhatsApp Button - Fixed at bottom right */}
      <a 
        href="https://wa.me/56950913358?text=Hola, necesito ayuda legal" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 bg-[#ffffff] hover:bg-[#101820] text-black-900 hover:text-white border-2 border-solid font-medium py-3 px-4 rounded-full shadow-lg flex items-center space-x-2 transition-colors duration-200"
      >
        
        <img className="w-5 h-5" alt="Icon WhatsApp" src="assets/whatsapp_logo_green.png" />
        
        <span>Habla con un abogado ahora</span>
      </a>

      <footer className="bg-muted border-t border-border relative z-10">
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>© 2026 LegalUp. Todos los derechos reservados.</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
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
            
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <span>Base in Chile</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;