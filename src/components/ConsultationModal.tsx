import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "./AuthModal";

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawyerName: string;
  lawyerId: string;
  hasFreeConsultation: boolean;
  consultationPrice: number;
}

export function ConsultationModal({ 
  isOpen, 
  onClose, 
  lawyerName, 
  lawyerId,
  hasFreeConsultation,
  consultationPrice
}: ConsultationModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // First, check if this is a free consultation and if the user has already used it
      if (hasFreeConsultation && user?.hasUsedFreeConsultation) {
        throw new Error('Ya has utilizado tu consulta gratuita');
      }

      // Create consultation record
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          client_id: user.id,
          lawyer_id: lawyerId,
          message,
          is_free: hasFreeConsultation,
          price: hasFreeConsultation ? 0 : consultationPrice,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // If free consultation, mark it as used in the database
      if (hasFreeConsultation && user) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { hasUsedFreeConsultation: true }
        });
        
        if (updateError) throw updateError;
        
        // Update local user state
        await refreshUser();
      }
      
      // Refresh user data to update the UI
      await refreshUser();

      toast({
        title: hasFreeConsultation ? "¡Consulta gratuita enviada!" : "¡Consulta enviada!",
        description: hasFreeConsultation 
          ? `Tu consulta gratuita ha sido enviada a ${lawyerName}.`
          : `Se ha generado un pago de $${consultationPrice.toLocaleString()} por tu consulta.`,
      });

      // Reset form and close modal
      setMessage("");
      onClose();
    } catch (error) {
      console.error('Error submitting consultation:', error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "No se pudo enviar la consulta. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {hasFreeConsultation ? "Consulta Gratuita" : `Consulta - $${consultationPrice.toLocaleString()}`}
          </DialogTitle>
          <DialogDescription>
            {hasFreeConsultation 
              ? `Estás a punto de enviar una consulta gratuita a ${lawyerName}.`
              : `El costo de esta consulta es de $${consultationPrice.toLocaleString()}.`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Tu consulta</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe tu consulta aquí..."
              required
              rows={5}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : hasFreeConsultation ? (
                "Enviar consulta gratuita"
              ) : (
                `Pagar $${consultationPrice.toLocaleString()}`
              )}
            </Button>
          </div>
        </form>
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </DialogContent>
    </Dialog>
  );
}
