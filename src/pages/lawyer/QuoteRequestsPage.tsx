import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuoteRequest {
  id: string;
  lawyer_id: string;
  service_id: string;
  service_title: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  description: string;
  status: 'pending' | 'quoted' | 'paid' | 'cancelled' | 'expired';
  quoted_price: number | null;
  quote_notes: string | null;
  quoted_at: string | null;
  mercadopago_preference_id: string | null;
  payment_link: string | null;
  payment_status: string | null;
  payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function QuoteRequestsPage() {
  const navigate = useNavigate();
  const { quoteRequestId } = useParams<{ quoteRequestId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');

  useEffect(() => {
    if (quoteRequestId) {
      loadQuoteRequest();
    }
  }, [quoteRequestId]);

  const loadQuoteRequest = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_quote_requests')
        .select('*')
        .eq('id', quoteRequestId)
        .eq('lawyer_id', user?.id)
        .single();

      if (error) throw error;
      setQuoteRequest(data);

      if (data.quoted_price) {
        setQuotedPrice(data.quoted_price.toString());
      }
      if (data.quote_notes) {
        setQuoteNotes(data.quote_notes);
      }
    } catch (error) {
      console.error('Error loading quote request:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la solicitud',
        variant: 'destructive',
      });
      navigate('/lawyer/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(quotedPrice);
    if (!price || price <= 0) {
      toast({
        title: 'Precio inválido',
        description: 'Por favor ingresa un precio válido',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: 'Sesión expirada',
          description: 'Inicia sesión nuevamente para enviar el presupuesto.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      console.log('[QUOTE] Sending quote:', {
        quoteRequestId,
        price,
        hasToken: !!session.access_token,
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-service-quote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            quote_request_id: quoteRequestId,
            quoted_price: price,
            quote_notes: quoteNotes.trim() || null,
          }),
        }
      );

      let errorMessage: string;
      try {
        const data = await response.json();
        errorMessage = data.error || '';
      } catch {
        errorMessage = await response.text().catch(() => '');
      }

      if (!response.ok) {
        console.error('[QUOTE] Error response:', { status: response.status, errorMessage });
        throw new Error(errorMessage || `Error del servidor (${response.status})`);
      }

      console.log('[QUOTE] Quote sent successfully');

      toast({
        title: 'Presupuesto enviado',
        description: 'El cliente recibirá un correo con el link de pago.',
      });

      // Reload the quote request
      await loadQuoteRequest();
    } catch (error) {
      console.error('Error sending quote:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo enviar el presupuesto',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
      quoted: { color: 'bg-blue-100 text-blue-800', icon: Send, label: 'Cotizado' },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Pagado' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Cancelado' },
      expired: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Expirado' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      </div>
    );
  }

  if (!quoteRequest) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => navigate('/lawyer/dashboard')} variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al dashboard
          </Button>
          <p className="text-center text-gray-600 mt-8">Solicitud no encontrada</p>
        </div>
      </div>
    );
  }

  const isPending = quoteRequest.status === 'pending';
  const isQuoted = quoteRequest.status === 'quoted';
  const isPaid = quoteRequest.status === 'paid';

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => navigate('/lawyer/jobs')} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver atrás
        </Button>

        <div className="grid gap-6">
          {/* Request Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Solicitud de Presupuesto</CardTitle>
                {getStatusBadge(quoteRequest.status)}
              </div>
              <CardDescription>
                Creada {formatDistanceToNow(parseISO(quoteRequest.created_at), { addSuffix: true, locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Servicio</Label>
                <p className="text-lg font-semibold">{quoteRequest.service_title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Cliente</Label>
                  <p className="text-gray-900">{quoteRequest.user_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-gray-900">{quoteRequest.user_email}</p>
                </div>
                {quoteRequest.user_phone && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Teléfono</Label>
                    <p className="text-gray-900">{quoteRequest.user_phone}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Descripción del caso</Label>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg mt-1">{quoteRequest.description}</p>
              </div>

              {isQuoted && quoteRequest.quoted_price && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900">Presupuesto enviado</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    ${quoteRequest.quoted_price.toLocaleString('es-CL')}
                  </p>
                  {quoteRequest.quote_notes && (
                    <p className="text-sm text-blue-800 mt-2">{quoteRequest.quote_notes}</p>
                  )}
                  <p className="text-xs text-blue-600 mt-2">
                    Enviado {quoteRequest.quoted_at ? formatDistanceToNow(parseISO(quoteRequest.quoted_at), { addSuffix: true, locale: es }) : ''}
                  </p>
                </div>
              )}

              {isPaid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900">Pago completado</p>
                  <p className="text-lg font-bold text-green-900 mt-1">
                    ${quoteRequest.quoted_price?.toLocaleString('es-CL')}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Pagado {quoteRequest.paid_at ? formatDistanceToNow(parseISO(quoteRequest.paid_at), { addSuffix: true, locale: es }) : ''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Form */}
          {isPending && (
            <Card>
              <CardHeader>
                <CardTitle>Enviar Presupuesto</CardTitle>
                <CardDescription>
                  Define el precio final y agrega comentarios para el cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitQuote} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Precio final (CLP) *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="450000"
                      value={quotedPrice}
                      onChange={(e) => setQuotedPrice(e.target.value)}
                      required
                      min="0"
                      step="1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Comentarios para el cliente</Label>
                    <Textarea
                      id="notes"
                      placeholder="Agrega detalles sobre el servicio, condiciones, etc."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gray-900 hover:bg-green-900"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar presupuesto
                      </>
                    )}
                  </Button>

                  <p className="text-sm text-gray-500 text-center">
                    Al enviar el presupuesto, se creará automáticamente un link de pago en MercadoPago
                    y se enviará un correo al cliente.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
