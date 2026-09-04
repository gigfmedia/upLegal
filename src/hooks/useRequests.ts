import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export type RequestItem = {
  id: string;
  kind: 'booking' | 'quote';
  rawId: string;
  lawyer_id: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  title: string;
  description: string | null;
  price: number | null;
  status: string;
  source: string | null;
  createdAt: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  serviceId: string | null;
};

export function useRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, quotesRes] = await Promise.all([
        supabase.from('bookings').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('service_quote_requests').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false }).limit(50),
      ]);
      if (bookingsRes.error) throw bookingsRes.error;
      if (quotesRes.error && !quotesRes.error.message.includes('Could not find the table')) throw quotesRes.error;

      const items: RequestItem[] = [];

      for (const b of (bookingsRes.data || []) as any[]) {
        items.push({
          id: `booking-${b.id}`,
          kind: 'booking',
          rawId: b.id,
          lawyer_id: b.lawyer_id,
          clientName: b.user_name || 'Cliente',
          clientEmail: b.user_email || null,
          clientPhone: b.user_phone || null,
          title: b.service_title || (b.booking_type === 'appointment' ? 'Cita agendada' : 'Solicitud de servicio'),
          description: b.service_description || null,
          price: b.price ?? null,
          status: b.status || 'pending',
          source: b.source || 'UNKNOWN',
          createdAt: b.created_at,
          scheduledDate: b.scheduled_date || null,
          scheduledTime: b.scheduled_time || null,
          serviceId: b.service_id || null,
        });
      }

      for (const q of (quotesRes.data || []) as any[]) {
        items.push({
          id: `quote-${q.id}`,
          kind: 'quote',
          rawId: q.id,
          lawyer_id: q.lawyer_id,
          clientName: q.user_name || 'Cliente',
          clientEmail: q.user_email || null,
          clientPhone: q.user_phone || null,
          title: q.service_title || 'Solicitud de presupuesto',
          description: q.description || null,
          price: q.quoted_price ?? null,
          status: q.status || 'pending',
          source: 'LEGALUP_MARKETPLACE',
          createdAt: q.created_at,
          scheduledDate: null,
          scheduledTime: null,
          serviceId: q.service_id || null,
        });
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { requests, loading, error, refetch: fetchRequests };
}
