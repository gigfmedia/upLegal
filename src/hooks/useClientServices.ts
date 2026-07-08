import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export type ServiceType = 'direct' | 'quote';

export type UnifiedStatus =
  | 'pending_payment'
  | 'quote_pending'
  | 'quote_received'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface ClientService {
  id: string;
  type: ServiceType;
  serviceTitle: string;
  serviceDescription: string | null;
  deliveryTime: string | null;
  price: number | null;
  status: UnifiedStatus;
  originalStatus: string;
  createdAt: string;
  lawyerId: string;
  lawyerName: string;
  lawyerAvatar: string | null;
  lawyerSlug?: string;
  mercadopagoPreferenceId: string | null;
  paymentLink: string | null;
  bookingId?: string;
  quoteRequestId?: string;
  quoteNotes?: string | null;
  quotedAt?: string | null;
  paidAt?: string | null;
}

export function useClientServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<ClientService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [bookingsResult, quotesResult] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            id,
            lawyer_id,
            service_title,
            service_description,
            service_delivery_time,
            price,
            status,
            payment_status,
            created_at,
            mercadopago_preference_id,
            payment_id,
            requires_meeting,
            profiles!bookings_lawyer_id_fkey (
              display_name,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('user_id', user.id)
          .eq('booking_type', 'service')
          .order('created_at', { ascending: false }),

        supabase
          .from('service_quote_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (quotesResult.error) throw quotesResult.error;

      const mapped: ClientService[] = [];

      for (const booking of bookingsResult.data || []) {
        const profile = booking.profiles as {
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
        } | null;

        const lawyerName = profile?.display_name
          || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
          || 'Abogado';

        let status: UnifiedStatus;
        if (booking.status === 'cancelled') {
          status = 'cancelled';
        } else if (booking.status === 'completed') {
          status = 'completed';
        } else if (booking.payment_status === 'approved' || booking.payment_status === 'paid') {
          status = 'in_progress';
        } else if (booking.status === 'confirmed') {
          status = 'in_progress';
        } else {
          status = 'pending_payment';
        }

        mapped.push({
          id: booking.id,
          type: 'direct',
          serviceTitle: booking.service_title || 'Servicio',
          serviceDescription: booking.service_description,
          deliveryTime: booking.service_delivery_time,
          price: booking.price,
          status,
          originalStatus: booking.status,
          createdAt: booking.created_at || '',
          lawyerId: booking.lawyer_id,
          lawyerName,
          lawyerAvatar: profile?.avatar_url || null,
          mercadopagoPreferenceId: booking.mercadopago_preference_id,
          paymentLink: null,
          bookingId: booking.id,
        });
      }

      for (const qr of quotesResult.data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', qr.lawyer_id)
          .single();

        const lawyerName = profile?.display_name
          || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
          || 'Abogado';

        let status: UnifiedStatus;
        switch (qr.status) {
          case 'pending':
            status = 'quote_pending';
            break;
          case 'quoted':
            status = 'quote_received';
            break;
          case 'paid':
            status = 'completed';
            break;
          case 'cancelled':
            status = 'cancelled';
            break;
          case 'expired':
            status = 'expired';
            break;
          default:
            status = 'quote_pending';
        }

        mapped.push({
          id: qr.id,
          type: 'quote',
          serviceTitle: qr.service_title || 'Servicio',
          serviceDescription: qr.description || null,
          deliveryTime: null,
          price: qr.quoted_price || null,
          status,
          originalStatus: qr.status,
          createdAt: qr.created_at || '',
          lawyerId: qr.lawyer_id,
          lawyerName,
          lawyerAvatar: profile?.avatar_url || null,
          mercadopagoPreferenceId: qr.mercadopago_preference_id,
          paymentLink: qr.payment_link || null,
          quoteRequestId: qr.id,
          quoteNotes: qr.quote_notes || null,
          quotedAt: qr.quoted_at || null,
          paidAt: qr.paid_at || null,
        });
      }

      mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setServices(mapped);
    } catch (err) {
      console.error('Error fetching client services:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, refetch: fetchServices };
}
