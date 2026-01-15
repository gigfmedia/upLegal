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
              Consulta legal online de 60 minutos con un abogado verificado en Chile.
            </p>
            <div className="pt-2">
              <Button 
                size="lg" 
                className="text-lg py-6 px-8 bg-blue-700 hover:bg-blue-800"
                onClick={() => navigate('/consulta/detalle')}
              >
                Agendar consulta – $30.000
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
