import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Scale } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

interface PaymentDetails {
  status: string;
  // Add other payment details fields as needed
}

interface AppointmentData {
  clientEmail: string;
  clientName: string;
  lawyerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  duration: string;
  description: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null);
  const sessionId = searchParams.get('session_id');
  
  // Load pending appointment data from localStorage
  useEffect(() => {
    const storedAppointment = localStorage.getItem('pendingAppointment');
    if (storedAppointment) {
      setAppointmentData(JSON.parse(storedAppointment));
      // Clear the stored data after loading
      localStorage.removeItem('pendingAppointment');
    }
  }, []);

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

        if (data.status === 'paid' && appointmentData) {
          try {
            await supabase.functions.invoke('send-appointment-email', {
              body: {
                clientEmail: appointmentData.clientEmail,
                clientName: appointmentData.clientName,
                lawyerName: appointmentData.lawyerName,
                lawyerEmail: '', // Will be filled in the server function
                appointmentDate: appointmentData.appointmentDate,
                appointmentTime: appointmentData.appointmentTime,
                serviceType: appointmentData.serviceType,
                status: 'scheduled',
                meetingDetails: `Duración: ${appointmentData.duration} minutos`,
                notes: appointmentData.description,
                sendToLawyer: true // Send to both client and lawyer
              }
            });
            
            toast({
              title: "¡Todo listo!",
              description: "Tu pago se ha procesado exitosamente y hemos enviado los detalles de tu cita por email.",
            });
          } catch (emailError) {
            console.error("Error sending appointment email:", emailError);
            // Still show success but with a note about email
            toast({
              title: "¡Pago completado!",
              description: "Tu pago se ha procesado exitosamente, pero hubo un error al enviar el correo de confirmación.",
              variant: "default",
            });
          }
        } else if (data.status === 'paid') {
          toast({
            title: "¡Pago completado!",
            description: "Tu pago se ha procesado exitosamente.",
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
  }, [sessionId, appointmentData]);

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex flex-col items-center justify-center p-4">
      <div 
        className="mb-8 flex items-center justify-center space-x-2 cursor-pointer"
        onClick={() => window.location.href = '/'}
      >
        <Scale className="h-8 w-8 text-blue-600" />
        <span className="text-2xl font-bold text-gray-900">LegalUp</span>
      </div>
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