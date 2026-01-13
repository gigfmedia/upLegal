import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Scale } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";

interface PaymentDetails {
  status: string;
  // Add other payment details fields as needed
}

interface AppointmentData {
  clientEmail: string;
  clientName: string;
  lawyerName: string;
  lawyerId?: string; // Added lawyerId
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  duration: string;
  description: string;
  contactMethod?: 'videollamada' | 'llamada';
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null);
  
  // MercadoPago parameters
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const externalReference = searchParams.get('external_reference');
  
  // Load pending appointment data from localStorage
  useEffect(() => {
    const storedAppointment = localStorage.getItem('pendingAppointment');
    if (storedAppointment) {
      setAppointmentData(JSON.parse(storedAppointment));
      // Clear the stored data after loading
      localStorage.removeItem('pendingAppointment');
    }
  }, []);

  const appointmentId = searchParams.get('appointmentId');

  useEffect(() => {
    const verifyPayment = async () => {
      // If we don't have a payment_id, we can't verify
      if (!paymentId) return;

      try {
        const { data: verifyData, error } = await supabase.functions.invoke('verify-payment', {
          body: { paymentId }
        });

        if (error) throw error;
        const data = verifyData;

        setPaymentDetails(data);
        setIsVerified(true);

        // Check if payment is approved
        if (data.status === 'approved' && appointmentData) {
          // 1. Create Google Meeting (if applicable)
          let meetLink = '';
          
          if (appointmentData.contactMethod === 'videollamada' && appointmentId) {
            try {
              const { data: meetData, error: meetError } = await supabase.functions.invoke('create-google-meeting', {
                body: { appointmentId }
              });
              
              if (meetData?.success === false || meetData?.error) {
                console.error('Edge Function reported error:', meetData.error);
                toast({
                  title: "Error creando Meet",
                  description: "Hubo un problema al generar el enlace de la reunión.",
                  variant: "destructive"
                });
              } else if (!meetError && meetData?.meetLink) {
                meetLink = meetData.meetLink;
              } else {
                console.warn('Could not create Google Meet:', meetError || 'No link returned');
                toast({
                  title: "Advertencia",
                  description: "No se pudo generar el enlace de Meet automáticamente.",
                  variant: "destructive"
                });
              }
            } catch (err) {
              console.error('Error creating Google Meet:', err);
            }
          }

          // Rest of the email sending logic...
          try {
            // Get the lawyer's email using ID if available
            let lawyerEmail = '';
            
            if (!meetLink && appointmentData.lawyerId) {
              const { data: lawyerProfile } = await supabase
                .from('profiles')
                .select('meet_link')
                .eq('id', appointmentData.lawyerId)
                .single();
                
              if (lawyerProfile?.meet_link) {
                meetLink = lawyerProfile.meet_link;
              }
            }

            // Send confirmation email
            const { data: emailData, error: emailFuncError } = await supabase.functions.invoke('send-appointment-email', {
              body: {
                clientEmail: appointmentData.clientEmail,
                clientName: appointmentData.clientName,
                lawyerName: appointmentData.lawyerName,
                lawyerId: appointmentData.lawyerId,
                lawyerEmail: lawyerEmail,
                appointmentDate: appointmentData.appointmentDate,
                appointmentTime: appointmentData.appointmentTime,
                serviceType: appointmentData.serviceType,
                status: 'scheduled',
                meetingDetails: `Duración: ${appointmentData.duration} minutos`,
                notes: appointmentData.description,
                contactMethod: appointmentData.contactMethod || 'videollamada',
                sendToLawyer: true,
                meetLink: meetLink
              }
            });

            if (emailFuncError) {
              console.error('Email function failed:', emailFuncError);
              toast({
                title: "Error enviando correo",
                description: "No se pudo enviar el correo de confirmación.",
                variant: "destructive"
              });
            } else if (emailData?.error) {
              console.error('Email service returned error:', emailData);
              toast({
                title: "Problema con el correo",
                description: "El servicio de correo reportó un error: " + (emailData.details || emailData.error),
                variant: "destructive"
              });
            } else {
              toast({
                title: "Correo enviado",
                description: "Se ha enviado la confirmación a tu correo.",
              });
            }
          } catch (emailError) {
            console.error('Error in email logic:', emailError);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error in payment verification:', error.message);
        } else {
          console.error('An unknown error occurred during payment verification');
        }
      }
    };

    verifyPayment();
  }, [paymentId, appointmentData]);

  if (!paymentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Información de pago no encontrada</h1>
          <p className="text-gray-600 mb-6">
            No se encontraron los detalles del pago. Si realizaste el pago, por favor contacta a soporte.
          </p>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.href = '/'}
          >
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 pt-24">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h1>
        
        {isVerified ? (
          <>
            <p className="text-gray-600 mb-6">
              Tu cita ha sido agendada correctamente. Hemos enviado un correo con los detalles.
            </p>
            
            {appointmentData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
                <p><strong>Abogado:</strong> {appointmentData.lawyerName}</p>
                <p><strong>Fecha:</strong> {appointmentData.appointmentDate}</p>
                <p><strong>Hora:</strong> {appointmentData.appointmentTime}</p>
              </div>
            )}
            
            {paymentDetails && (
               <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm mt-2">
                <p><strong>Estado:</strong> {paymentDetails.status === 'approved' ? 'Aprobado' : paymentDetails.status}</p>
                <p><strong>ID de pago:</strong> {paymentId}</p>
               </div>
            )}
          </>
        ) : (
          <p className="text-gray-600 mb-6">
            Verificando tu pago...
          </p>
        )}

        <div className="space-y-3">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.href = '/dashboard/appointments'}
          >
            Ver mis citas
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/'}
          >
            Volver al inicio
          </Button>
        </div>
      </Card>
    </div>
    </>
  );
}