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

  useEffect(() => {
    const verifyPayment = async () => {
      // If we don't have a payment_id, we can't verify
      if (!paymentId) return;

      try {
        
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { paymentId }
        });

        if (error) throw error;

        setPaymentDetails(data);
        setIsVerified(true);

        // Check if payment is approved
        if (data.status === 'approved' && appointmentData) {
          try {
            // Get the lawyer's email using ID if available, otherwise fallback to name (less reliable)
            let lawyerEmail = '';
            
            if (appointmentData.lawyerId) {
              const { data: lawyerData } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', appointmentData.lawyerId)
                .single();
                
              if (lawyerData) {
                lawyerEmail = lawyerData.email;
              }
            } else {
              // Fallback to name search (legacy support)
              const { data: lawyerData } = await supabase
                .from('profiles')
                .select('email')
                .ilike('first_name', `%${appointmentData.lawyerName.split(' ')[0]}%`)
                .eq('role', 'lawyer')
                .limit(1)
                .single();
                
              if (lawyerData) {
                lawyerEmail = lawyerData.email;
              }
            }
            
            // Send confirmation email
            await supabase.functions.invoke('send-appointment-email', {
              body: {
                clientEmail: appointmentData.clientEmail,
                clientName: appointmentData.clientName,
                lawyerName: appointmentData.lawyerName,
                lawyerId: appointmentData.lawyerId, // Pass ID for robust lookup
                lawyerEmail: lawyerEmail, // Now correctly fetched
                appointmentDate: appointmentData.appointmentDate,
                appointmentTime: appointmentData.appointmentTime,
                serviceType: appointmentData.serviceType,
                status: 'scheduled',
                meetingDetails: `Duración: ${appointmentData.duration} minutos`,
                notes: appointmentData.description,
                contactMethod: appointmentData.contactMethod || 'videollamada',
                sendToLawyer: true // Send to both client and lawyer
              }
            });
            
          } catch (emailError) {
            console.error('Error sending email:', emailError);
            // Don't block the success page if email fails, but log it
          }
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
      }
    };

    verifyPayment();
  }, [paymentId, appointmentData]); // Re-run if paymentId or appointmentData changes

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