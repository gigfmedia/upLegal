import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, toCents, fromCents } from '@/lib/utils/currency';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/router';

const paymentFormSchema = z.object({
  amount: z.string().min(1, 'El monto es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  serviceId: z.string().optional(),
  successUrl: z.string().url().default(window.location.origin + '/payments/success'),
  failureUrl: z.string().url().default(window.location.origin + '/payments/failure'),
  pendingUrl: z.string().url().default(window.location.origin + '/payments/pending'),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  lawyerId: string;
  serviceId?: string;
  defaultAmount?: number;
  defaultDescription?: string;
  onSuccess?: (paymentData: { id: string; status: string }) => void;
  className?: string;
}

export function PaymentForm({
  lawyerId,
  serviceId,
  defaultAmount = 0,
  defaultDescription = '',
  onSuccess,
  className = '',
}: PaymentFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [platformFee, setPlatformFee] = useState(0);
  const [lawyerAmount, setLawyerAmount] = useState(0);
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: defaultAmount > 0 ? fromCents(defaultAmount).toString() : '',
      description: defaultDescription,
      serviceId,
    },
  });

  // Calculate fees when amount changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'amount' && value.amount) {
        const amount = parseFloat(value.amount) || 0;
        const amountInCents = toCents(amount);
        const fee = Math.round(amountInCents * 0.2); // 20% platform fee
        setPlatformFee(fee);
        setLawyerAmount(amountInCents - fee);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, form.watch]);

  const onSubmit = async (data: PaymentFormValues) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para realizar un pago',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const amountInCents = toCents(parseFloat(data.amount));
      const paymentIntent = await createPaymentIntent({
        amount: amountInCents,
        lawyerId,
        serviceId: data.serviceId,
        metadata: {
          description: data.description,
        },
      });

      // Call success handler if provided
      if (onSuccess) {
        onSuccess(paymentIntent);
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar el pago. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Realizar Pago</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto (CLP)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              {...form.register('amount', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-500">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              disabled={isLoading}
              placeholder="Ej. Asesoría legal sobre contrato de arriendo"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Fee breakdown */}
          <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monto del abogado:</span>
              <span className="font-medium">{formatCurrency(lawyerAmount, 'CLP')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Comisión de la plataforma (20%):</span>
              <span className="font-medium">{formatCurrency(platformFee, 'CLP')}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Total a pagar:</span>
              <span className="font-bold">
                {formatCurrency(lawyerAmount + platformFee, 'CLP')}
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Procesando...' : 'Pagar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
