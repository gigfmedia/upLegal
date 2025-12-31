import { Heart } from "lucide-react";
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-muted border-t border-border">
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>© 2025 LegalUp. Todos los derechos reservados.</span>
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
  );
};

export default Footer;
