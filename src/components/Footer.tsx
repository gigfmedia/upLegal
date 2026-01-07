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
        {/* <img className="w-5 h-5" alt="Icon WhatsApp" src="assets/whatsapp_logo_green.png" /> */}
        <svg fill="#25D366" width="24px" height="24px" viewBox="-2 -2 24 24" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin"><path d='M9.516.012C4.206.262.017 4.652.033 9.929a9.798 9.798 0 0 0 1.085 4.465L.06 19.495a.387.387 0 0 0 .47.453l5.034-1.184a9.981 9.981 0 0 0 4.284 1.032c5.427.083 9.951-4.195 10.12-9.58C20.15 4.441 15.351-.265 9.516.011zm6.007 15.367a7.784 7.784 0 0 1-5.52 2.27 7.77 7.77 0 0 1-3.474-.808l-.701-.347-3.087.726.65-3.131-.346-.672A7.62 7.62 0 0 1 2.197 9.9c0-2.07.812-4.017 2.286-5.48a7.85 7.85 0 0 1 5.52-2.271c2.086 0 4.046.806 5.52 2.27a7.672 7.672 0 0 1 2.287 5.48c0 2.052-.825 4.03-2.287 5.481z'/><path d='M14.842 12.045l-1.931-.55a.723.723 0 0 0-.713.186l-.472.478a.707.707 0 0 1-.765.16c-.913-.367-2.835-2.063-3.326-2.912a.694.694 0 0 1 .056-.774l.412-.53a.71.71 0 0 0 .089-.726L7.38 5.553a.723.723 0 0 0-1.125-.256c-.539.453-1.179 1.14-1.256 1.903-.137 1.343.443 3.036 2.637 5.07 2.535 2.349 4.566 2.66 5.887 2.341.75-.18 1.35-.903 1.727-1.494a.713.713 0 0 0-.408-1.072z'/></svg>
        <span>Habla con un abogado</span>
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