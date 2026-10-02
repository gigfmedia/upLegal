import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

/**
 * FASE 5.2D — aviso compacto en Citas cuando Google no está conectado.
 * Solo lectura de estado; el flujo OAuth vive en Integraciones.
 */
export function GoogleCalendarNotice() {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [connected, setConnected] = useState(true); // optimista: no mostrar ruido hasta saber

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('google_integrations')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setConnected(!!data);
        setChecked(true);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!checked || connected) return null;

  return (
    <Link
      to="/lawyer/integrations"
      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm hover:bg-gray-50"
    >
      <span className="inline-flex min-w-0 items-center gap-2 text-gray-700">
        <Calendar className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span className="truncate">Conecta Google Calendar para sincronizar tus citas y generar enlaces de Meet.</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-green-700">Conectar</span>
    </Link>
  );
}
