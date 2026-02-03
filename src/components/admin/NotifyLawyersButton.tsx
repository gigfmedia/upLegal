import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface NotificationResult {
  email: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

export function NotifyLawyersButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [results, setResults] = useState<NotificationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleNotifyLawyers = async () => {
    setIsConfirmOpen(true);
  };

  const confirmNotification = async () => {
    setIsConfirmOpen(false);
    setError(null);
    setIsLoading(true);
    setResults([]);

    try {
      console.log('Sending notification request with testMode:', testMode);
      
      const response = await fetch('/api/admin/notify-lawyers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testMode, testEmail: 'juan.fercommerce@gmail.com' })
      });

      // First check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server responded with error:', response.status, errorText);
        
        let errorMessage = `Error del servidor (${response.status})`;
        try {
          // Try to parse the error message if it's JSON
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorJson.message || errorText;
        } catch (e) {
          // If not JSON, use the raw text
          errorMessage = errorText || 'Error desconocido del servidor';
        }
        
        throw new Error(errorMessage);
      }

      // If response is OK, try to parse as JSON
      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        throw new Error('La respuesta del servidor no es válida');
      }

      console.log('Notification result:', result);

      if (result.results) {
        setResults(Array.isArray(result.results) ? result.results : []);
      }

      toast({
        title: result.success !== false ? 'Notificaciones enviadas' : 'Error al enviar notificaciones',
        description: result.message || (result.success ? 'Las notificaciones se enviaron correctamente' : 'Hubo un error al enviar las notificaciones'),
        variant: result.success !== false ? 'default' : 'destructive',
      });

      if (result.error) {
        setError(result.error.message || 'Error desconocido');
      }
    } catch (err) {
      console.error('Error notificando abogados:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al enviar notificaciones';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow">
      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar envío de notificaciones</DialogTitle>
            <DialogDescription>
              {testMode 
                ? '¿Estás seguro de que deseas enviar una notificación de prueba a juan.fercocommerce@gmail.com?'
                : '¿Estás seguro de que deseas enviar notificaciones a todos los abogados sin servicios registrados?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsConfirmOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={confirmNotification}
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">Notificar a abogados sin servicios</h3>
          <p className="text-sm text-gray-600">
            {testMode 
              ? 'MODO PRUEBA: Solo se enviará a juan.fercocommerce@gmail.com' 
              : 'Se enviará a todos los abogados sin servicios registrados'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Modo Prueba</span>
          <button
            type="button"
            onClick={() => setTestMode(!testMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${testMode ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${testMode ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>
      
      <Button 
        onClick={handleNotifyLawyers}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Enviando...
          </>
        ) : testMode ? 'Probar notificación' : 'Notificar a todos los abogados'}
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="font-medium">Resultados del envío:</h4>
            <div className="flex items-center text-sm text-muted-foreground gap-4">
              <span className="flex items-center">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                {results.filter(r => r.success).length} exitosos
              </span>
              {results.some(r => !r.success) && (
                <span className="flex items-center">
                  <XCircle className="h-4 w-4 text-red-500 mr-1" />
                  {results.filter(r => !r.success).length} fallidos
                </span>
              )}
            </div>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{result.email}</TableCell>
                    <TableCell>
                      {result.success ? (
                        <span className="text-green-600">✓ Enviado</span>
                      ) : (
                        <span className="text-red-600">✗ Error: {result.error || 'Desconocido'}</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(result.timestamp).toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Total: {results.length} | 
            <span className="text-green-600"> Enviados: {results.filter(r => r.success).length}</span> | 
            <span className="text-red-600"> Fallidos: {results.filter(r => !r.success).length}</span>
          </p>
        </div>
      )}
    </div>
  );
}
