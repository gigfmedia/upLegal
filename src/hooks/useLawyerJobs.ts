import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export type JobSource = 'booking' | 'quote';

export type JobStatus =
  | 'quote_pending'
  | 'pending_payment'
  | 'quote_sent'
  | 'paid'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface LawyerJob {
  id: string;
  source: JobSource;
  sourceId: string;
  serviceTitle: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientId: string | null;
  description: string | null;
  price: number | null;
  status: JobStatus;
  originalStatus: string;
  createdAt: string;
  deliveryTime: string | null;
  serviceType: 'direct' | 'quote';
  mercadopagoPreferenceId: string | null;
  paymentLink: string | null;
  quoteRequestId?: string;
  bookingId?: string;
  quoteNotes?: string | null;
}

export function useLawyerJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<LawyerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
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
          .select('*')
          .eq('lawyer_id', user.id)
          .eq('booking_type', 'service')
          .order('created_at', { ascending: false }),

        supabase
          .from('service_quote_requests')
          .select('*')
          .eq('lawyer_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (quotesResult.error) throw quotesResult.error;

      const mapped: LawyerJob[] = [];

      for (const booking of bookingsResult.data || []) {
        let status: JobStatus;
        if (booking.status === 'cancelled') {
          status = 'cancelled';
        } else if (booking.status === 'completed') {
          status = 'completed';
        } else if (booking.status === 'in_progress') {
          status = 'in_progress';
        } else if (
          booking.payment_status === 'approved' ||
          booking.payment_status === 'paid' ||
          booking.status === 'confirmed'
        ) {
          status = 'paid';
        } else {
          status = 'pending_payment';
        }

        mapped.push({
          id: `booking-${booking.id}`,
          source: 'booking',
          sourceId: booking.id,
          serviceTitle: booking.service_title || 'Servicio',
          clientName: booking.user_name || 'Cliente',
          clientEmail: booking.user_email || '',
          clientPhone: booking.user_phone || null,
          clientId: booking.user_id || null,
          description: booking.service_description || null,
          price: booking.price || null,
          status,
          originalStatus: booking.status,
          createdAt: booking.created_at || '',
          deliveryTime: booking.service_delivery_time || null,
          serviceType: 'direct',
          mercadopagoPreferenceId: booking.mercadopago_preference_id || null,
          paymentLink: null,
          bookingId: booking.id,
        });
      }

      for (const qr of quotesResult.data || []) {
        let status: JobStatus;
        switch (qr.status) {
          case 'pending':
            status = 'quote_pending';
            break;
          case 'quoted':
            status = 'quote_sent';
            break;
          case 'paid':
            status = 'paid';
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
          id: `quote-${qr.id}`,
          source: 'quote',
          sourceId: qr.id,
          serviceTitle: qr.service_title || 'Servicio',
          clientName: qr.user_name || 'Cliente',
          clientEmail: qr.user_email || '',
          clientPhone: qr.user_phone || null,
          clientId: qr.user_id || null,
          description: qr.description || null,
          price: qr.quoted_price || null,
          status,
          originalStatus: qr.status,
          createdAt: qr.created_at || '',
          deliveryTime: null,
          serviceType: 'quote',
          mercadopagoPreferenceId: qr.mercadopago_preference_id || null,
          paymentLink: qr.payment_link || null,
          quoteRequestId: qr.id,
          quoteNotes: qr.quote_notes || null,
        });
      }

      mapped.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setJobs(mapped);
    } catch (err) {
      console.error('Error fetching lawyer jobs:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar trabajos');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const startWork = async (job: LawyerJob): Promise<void> => {
    if (job.source === 'booking') {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', job.sourceId);

      if (error) throw error;
    } else if (job.source === 'quote' && job.quoteRequestId) {
      const { error } = await supabase
        .from('bookings')
        .insert({
          booking_type: 'service',
          lawyer_id: user!.id,
          user_id: job.clientId,
          user_name: job.clientName,
          user_email: job.clientEmail,
          user_phone: job.clientPhone,
          service_title: job.serviceTitle,
          service_description: job.description,
          service_delivery_time: job.deliveryTime,
          price: job.price || 0,
          status: 'in_progress',
          duration: 0,
        });

      if (error) throw error;
    }

    await fetchJobs();
  };

  const markDelivered = async (job: LawyerJob): Promise<void> => {
    if (job.source !== 'booking') return;

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', job.sourceId);

    if (error) throw error;
    await fetchJobs();
  };

  return { jobs, loading, error, refetch: fetchJobs, startWork, markDelivered };
}
