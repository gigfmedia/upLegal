import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg 
                className="h-6 w-6 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
                />
              </svg>
            </div>
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver atrás
          </Button>
          
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-800"
            >
              Ir a la página de inicio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
