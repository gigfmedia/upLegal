import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";

export default function ConsultaConfirmacion() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      <Header />
      <div className="flex justify-center mb-6">
        <div className="bg-green-100 p-4 rounded-full">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>
      
      <h1 className="text-3xl font-bold mb-4">¡Pago confirmado!</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Hemos recibido tu solicitud de consulta. Te contactaremos dentro de 24 horas hábiles para coordinar los detalles.
      </p>
      
      <div className="space-y-4 max-w-xs mx-auto">
        <Button 
          className="w-full py-6 text-lg"
          onClick={() => navigate('/')}
        >
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
