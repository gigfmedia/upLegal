import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, ChevronRight } from 'lucide-react';

interface InArticleCTAProps {
  message: string;
  buttonText?: string;
  category?: string;
}

const InArticleCTA: React.FC<InArticleCTAProps> = ({ 
  message, 
  buttonText = "Hablar con abogado ahora",
  category = "Derecho Laboral"
}) => {
  const isLaboral = category.toLowerCase().includes('laboral');
  const targetUrl = isLaboral 
    ? `/search?category=${encodeURIComponent(category)}`
    : `/consulta/detalle?category=${encodeURIComponent(category)}`;

  return (
    <div className="my-8 py-8 border rounded-md px-6 text-center group">
      <p className="text-gray-900 mb-6 font-medium leading-relaxed max-w-xl mx-auto">
        {message}
      </p>
      <div className="flex flex-col items-center gap-3">
        <Link to={targetUrl} className="w-full sm:w-auto">
          <Button 
            className="bg-gray-900 hover:bg-green-900 text-white px-8 h-11 rounded-md transition-all shadow-sm active:scale-95 w-full sm:w-auto font-bold text-sm"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {buttonText}
            <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <p className="text-xs text-gray-500 font-medium italic">
          Conecta con un abogado disponible y resuelve tus dudas hoy.
        </p>
      </div>
    </div>
  );
};

export default InArticleCTA;
