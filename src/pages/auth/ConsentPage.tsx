import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { TermsConsentCheckbox } from '@/components/auth/TermsConsentCheckbox';
import { CONSENT_ERROR, buildConsentPatch, sanitizeRedirectForConsent } from '@/lib/legalConsent';

/**
 * FASE 5.6 — interstitial post-OAuth para cuentas nuevas sin aceptación.
 * Solo se llega aquí si el perfil no tiene timestamps (usuarios existentes
 * con historial pasan de largo). Escribe y continúa al destino original.
 */
export default function ConsentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dest = sanitizeRedirectForConsent(params.get('redirectTo'));

  const handleAccept = async () => {
    if (!checked) {
      setError(CONSENT_ERROR);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/?login=true', { replace: true });
        return;
      }
      const { error } = await supabase.from('profiles').update(buildConsentPatch()).eq('id', user.id);
      if (error) throw error;
      navigate(dest, { replace: true });
    } catch (e) {
      toast({
        title: 'No se pudo guardar tu aceptación',
        description: e instanceof Error ? e.message : 'Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Un paso más para crear tu cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TermsConsentCheckbox
            checked={checked}
            onCheckedChange={(v) => {
              setChecked(v);
              if (v) setError(null);
            }}
            error={error}
          />
          <Button onClick={handleAccept} disabled={saving} className="h-11 w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
              </>
            ) : (
              'Aceptar y continuar'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
