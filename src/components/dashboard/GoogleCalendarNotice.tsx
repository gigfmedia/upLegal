import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

/**
 * FASE 5.2D + 4.60C.1 — aviso compacto en Citas cuando Google no está
 * conectado. Estado vía endpoint canónico; el browser nunca lee la tabla.
 */
export function GoogleCalendarNotice() {
  const [checked, setChecked] = useState(false);
  const [connected, setConnected] = useState(true); // optimista: no mostrar ruido hasta saber

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) {
        if (!cancelled) setChecked(true);
        return;
      }
      return supabase.functions
        .invoke('google-auth/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        .then(({ data }) => {
          if (cancelled) return;
          setConnected((data as { connected?: boolean } | null)?.connected === true);
          setChecked(true);
        })
        .catch(() => {
          // Ante error no afirmar desconexión: no mostrar aviso.
          if (!cancelled) setChecked(true);
        });
    });
    return () => { cancelled = true; };
  }, []);

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
