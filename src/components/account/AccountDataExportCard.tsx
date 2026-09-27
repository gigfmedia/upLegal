import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

/**
 * Keys that must never land in a downloaded export, even though they may
 * exist on the profile/metadata rows. The legacy client export dumped the
 * full profiles row, which can carry live Mercado Pago tokens.
 */
const SENSITIVE_KEY_PATTERN = /token|secret|credential|password/i;

function sanitizeExportValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeExportValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) continue;
      out[key] = sanitizeExportValue(entry);
    }
    return out;
  }
  return value;
}

type Props = {
  /** Analytics-free; kept minimal on purpose. */
  compact?: boolean;
};

/**
 * 4.54C — shared account data export (lawyer + client settings).
 * Same scope as the legacy client export (own profile row, local
 * notification/privacy prefs, own user_metadata) as a JSON download —
 * except sensitive credential patterns are stripped (4.54B §9 finding:
 * the legacy dump included live Mercado Pago tokens).
 *
 * Read-only for the user: current authenticated identity only (RLS +
 * session), no service role, no other-user fetch, no backend mutation.
 */
export function AccountDataExportCard({ compact = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleExportData = async () => {
    try {
      setIsLoading(true);

      let profileData: unknown = null;
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw new Error('No se pudo obtener la información del perfil');
        }
        profileData = data || null;
      }

      let notifications: unknown = null;
      let privacy: unknown = null;
      try {
        if (user) {
          const savedNotifications = localStorage.getItem(`notifications_${user.id}`);
          const savedPrivacy = localStorage.getItem(`privacy_${user.id}`);
          if (savedNotifications) notifications = JSON.parse(savedNotifications);
          if (savedPrivacy) privacy = JSON.parse(savedPrivacy);
        }
      } catch {
        /* local prefs are best effort */
      }

      const userData = sanitizeExportValue({
        perfil: profileData,
        notificaciones: notifications,
        privacidad: privacy,
        metadatos: user?.user_metadata || {},
        fechaExportacion: new Date().toISOString(),
      });

      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `upLegal-datos-${new Date().toISOString().split('T')[0]}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Datos exportados',
        description: 'Tus datos se han descargado correctamente.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'No se pudieron exportar los datos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h4 className="font-medium">Exportar datos</h4>
        <p className="text-sm text-muted-foreground">
          Descarga una copia de los datos de tu cuenta en formato JSON.
        </p>
        <Button
          variant="outline"
          onClick={handleExportData}
          disabled={isLoading}
          className={compact ? '' : 'w-full sm:w-auto'}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar datos
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
