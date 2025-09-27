import { useState } from 'react';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function StripeConnectButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, session } = useAuth();

  const handleConnectStripe = async () => {
    if (!user || !session) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/create-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al conectar con Stripe');
      }

      const { url } = await response.json();
      
      if (!url) {
        throw new Error('No se recibió la URL de redirección de Stripe');
      }
      
      // Redirect to Stripe onboarding
      window.location.href = url;
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo iniciar el proceso de verificación con Stripe',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleConnectStripe}
      disabled={isLoading}
      className="w-full sm:w-auto"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        'Conectar con Stripe'
      )}
    </Button>
  );
}
