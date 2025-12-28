import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BookingData {
  lawyer_id: string;
  lawyer_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  price: number;
}

interface PreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingData;
}

export default function PreCheckoutModal({ isOpen, onClose, bookingData }: PreCheckoutModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos',
        variant: 'destructive'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create booking via API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lawyer_id: bookingData.lawyer_id,
          user_email: email,
          user_name: name,
          scheduled_date: bookingData.scheduled_date,
          scheduled_time: bookingData.scheduled_time,
          duration: bookingData.duration,
          price: bookingData.price
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la reserva');
      }

      // Track GA4 event
      if (window.gtag) {
        window.gtag('event', 'lead_created', {
          lawyer_id: bookingData.lawyer_id,
          duration: bookingData.duration,
          price: bookingData.price
        });
      }

      // Redirect to MercadoPago payment
      if (data.payment_link) {
        // Track begin_checkout event
        if (window.gtag) {
          window.gtag('event', 'begin_checkout', {
            booking_id: data.booking_id,
            value: bookingData.price,
            currency: 'CLP',
            items: [{
              item_id: data.booking_id,
              item_name: `Asesoría con ${bookingData.lawyer_name}`,
              price: bookingData.price,
              quantity: 1
            }]
          });
        }

        window.location.href = data.payment_link;
      } else {
        throw new Error('No se recibió el link de pago');
      }

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear la reserva',
        variant: 'destructive'
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirma tu asesoría legal</DialogTitle>
          <DialogDescription>
            Estás a un paso de hablar con un abogado verificado por videollamada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <div className="relative">
              {/* <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" /> */}
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              {/* <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" /> */}
              <Input
                id="email"
                type="email"
                placeholder="juan@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">Resumen de tu asesoría:</p>
              <p>• Abogado verificado en PJUD: {bookingData.lawyer_name}</p>
              <p>• Duración: {bookingData.duration} minutos</p>
              <p>• Total: ${bookingData.price.toLocaleString('es-CL')}</p>
              <p>• Reembolso si el abogado no asiste</p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar y pagar asesoría'
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Al continuar, serás redirigido a MercadoPago para completar el pago de forma segura
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
