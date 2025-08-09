import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) return;

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (error) throw error;

        setPaymentDetails(data);
        setIsVerified(true);

        if (data.status === 'paid') {
          toast({
            title: "¡Pago completado!",
            description: "Tu pago se ha procesado exitosamente",
          });
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast({
          title: "Error",
          description: "No se pudo verificar el pago",
          variant: "destructive",
        });
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p>Sesión de pago no encontrada</p>
            <Link to="/">
              <Button className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            ¡Pago Exitoso!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Tu pago se ha procesado correctamente. El abogado se pondrá en contacto contigo pronto.
          </p>
          
          {isVerified && paymentDetails && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p><strong>Estado:</strong> {paymentDetails.status === 'paid' ? 'Pagado' : 'Pendiente'}</p>
              <p><strong>ID de sesión:</strong> {sessionId}</p>
            </div>
          )}

          <div className="space-y-2">
            <Link to="/">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}