import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Hide footer on 404 page
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }

    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Show footer again when leaving 404 page
    return () => {
      if (footer) {
        footer.style.display = 'block';
      }
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-green-900" />
            <span className="text-2xl font-bold text-gray-900">LegalUp</span>
          </div>
        </div>
        
        <div className="text-center">
          <h1 className="mt-6 text-5xl font-extrabold text-gray-900">404</h1>
          <h2 className="mt-4 text-2xl font-medium text-gray-900">¡Oops! Página no encontrada</h2>
          <p className="mt-2 text-gray-600">
            Lo sentimos, no pudimos encontrar la página que estás buscando.
          </p>
        </div>
        
        <div className="mt-8">
          <Button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver atrás
          </Button>
          
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-green-900 hover:text-green-600"
            >
              Ir a la página de inicio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
