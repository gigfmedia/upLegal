import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';

export default function Consulta() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl px-4 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Habla con un abogado hoy</h1>
            <p className="text-xl text-muted-foreground">
              Consulta legal online inmediata con un abogado verificado en Chile.
            </p>
            <p className="text-sm text-muted-foreground">Duración aproximada: 20-30 minutos · Pago único · Videollamada</p>
            <p className="text-sm text-muted-foreground">La duración puede variar según la complejidad del caso</p>
            <div className="pt-2">
              <Button 
                size="lg" 
                className="text-lg py-6 px-8 bg-blue-700 hover:bg-blue-800"
                onClick={() => navigate('/consulta/detalle')}
              >
                Agendar consulta – $30.000
              </Button>
              <p className="text-sm text-muted-foreground mt-6">Abogados verificados · 🔒 Pago seguro con MercadoPago</p>
              <p className="text-sm text-muted-foreground mt-4">Después del pago, te contactamos por email para coordinar la videollamada.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
