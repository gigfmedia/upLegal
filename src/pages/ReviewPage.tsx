import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Star, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function ReviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [lawyer, setLawyer] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('review_tokens')
          .select('*')
          .eq('token', token)
          .eq('used', false)
          .gte('expires_at', new Date().toISOString())
          .single();

        if (tokenError || !tokenData) {
          console.error('Error validating token:', tokenError);
          setTokenValid(false);
          setLoading(false);
          return;
        }

        // Si es un token manual (empezando con ceros) o no tiene cita, saltar fetch de cita
        if (!tokenData.appointment_id || tokenData.appointment_id.startsWith('00000000')) {
          setAppointment(null);
          setLawyer(null);
          setClient(null);
          setTokenValid(true);
          setLoading(false);
          return;
        }

        // Cargar cita y perfiles manualmente (evitando errores de join por falta de FK)
        const { data: apptData, error: apptError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', tokenData.appointment_id)
          .single();

        if (apptError) {
          console.error('Error fetching appointment:', apptError);
          // Permitimos que continúe si al menos el token es válido, 
          // pero mostramos aviso si es crítico
        }

        if (apptData) {
          setAppointment(apptData);
          
          // Cargar perfiles
          const [{ data: lawyerProfile }, { data: clientProfile }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', apptData.lawyer_id).single(),
            supabase.from('profiles').select('*').eq('user_id', apptData.user_id).single()
          ]);

          setLawyer(lawyerProfile);
          setClient(clientProfile);
        }

        setTokenValid(true);
      } catch (error) {
        console.error('Error validating token:', error);
        setTokenValid(false);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenValid) return;

    setSubmitting(true);
    try {
      // Para tokens manuales, no hay cita real asociada
      const lawyerId = lawyer?.id || null;
      const clientId = client?.id || null;
      const appointmentId = appointment?.id || null;

      if (!lawyerId) {
        toast({
          title: 'Error',
          description: 'No se encontró información del abogado para esta reseña.',
          variant: 'destructive',
        });
        return;
      }

      // 1. Guardar la reseña
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert([
          {
            lawyer_id: lawyerId,
            client_id: clientId,
            appointment_id: appointmentId,
            rating,
            comment: review,
            status: 'approved'
          },
        ]);

      if (reviewError) throw reviewError;

      // 2. Marcar el token como usado
      const { error: tokenError } = await supabase
        .from('review_tokens')
        .update({ 
          used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('token', searchParams.get('token'));

      if (tokenError) throw tokenError;

      // 3. Actualizar el rating promedio del abogado (solo si hay lawyer_id)
      if (lawyerId) {
        const { data: avgRating } = await supabase
          .rpc('calculate_lawyer_rating', { lawyer_id: lawyerId });

        if (avgRating !== null) {
          await supabase
            .from('profiles')
            .update({ rating: avgRating })
            .eq('id', lawyerId);
        }

        // 4. Incrementar el contador de reseñas del abogado
        await supabase.rpc('increment_review_count', { 
          lawyer_id: lawyerId 
        });
      }

      toast({
        title: '¡Gracias por tu reseña!',
        description: 'Tu opinión es muy valiosa para nosotros.',
      });

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al enviar tu reseña. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando enlace de revisión...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enlace no válido o expirado</h1>
          <p className="text-gray-600 mb-6">
            El enlace de revisión no es válido o ha expirado. Por favor, contacta al soporte si necesitas ayuda.
          </p>
          <Button onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-blue-600 to-blue-700">
            <h1 className="text-xl font-semibold text-white">Califica tu experiencia</h1>
            <p className="mt-1 text-sm text-blue-100">
              {lawyer?.first_name && lawyer?.last_name 
                ? `Comparte tu opinión sobre la asesoría con ${lawyer.first_name} ${lawyer.last_name}`
                : 'Comparte tu opinión sobre la asesoría'
              }
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Cómo calificarías la asesoría?
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          value <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">
                    {rating} estrella{rating !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
                  Cuéntanos sobre tu experiencia (opcional)
                </label>
                <textarea
                  id="review"
                  rows={4}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-3"
                  placeholder="¿Qué te pareció la asesoría? ¿Algo que quieras destacar?"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? 'Enviando...' : 'Enviar reseña'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
