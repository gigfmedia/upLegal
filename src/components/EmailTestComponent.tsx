import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function EmailTestComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testAppointmentEmail = async () => {
    setIsLoading(true);
    try {
      
      const { data, error } = await supabase.functions.invoke('send-appointment-email', {
        body: {
          clientEmail: "gigfmedia@icloud.com",
          clientName: "Test Usuario",
          lawyerName: "Juan Pérez",
          lawyerEmail: "abogado@test.com",
          appointmentDate: format(toZonedTime(new Date(Date.now() + 86400000), 'America/Santiago'), 'yyyy-MM-dd'),
          appointmentTime: format(toZonedTime(new Date(Date.now() + 86400000), 'America/Santiago'), 'HH:mm'),
          serviceType: "Consulta inicial",
          status: "scheduled",
          meetingDetails: "Reunión vía Google Meet - Link incluido abajo",
          notes: "Este es un email de prueba del sistema de notificaciones",
          contactMethod: "videollamada",
          sendToLawyer: false,
          meetLink: "https://meet.google.com/meet-1234-abcd"
        }
      });

      if (error) {
        console.error("Error enviando email de prueba:", error);
        toast({
          title: "Error",
          description: `Error al enviar email de prueba: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado",
          description: "Email de prueba enviado exitosamente a gigfmedia@icloud.com",
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: `Error inesperado: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">Test de Email de Agendamiento</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Envía un email de prueba de agendamiento a: <strong>gigfmedia@icloud.com</strong>
      </p>
      <Button 
        onClick={testAppointmentEmail}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Enviando..." : "Enviar Email de Prueba"}
      </Button>
    </div>
  );
}