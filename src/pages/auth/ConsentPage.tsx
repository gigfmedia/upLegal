import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { TermsConsentCheckbox } from '@/components/auth/TermsConsentCheckbox';
import { CONSENT_ERROR, buildConsentPatch, hasLegalConsent, sanitizeRedirectForConsent } from '@/lib/legalConsent';
import { buildRoleOnboardingPath, needsRoleSelection } from '@/lib/roleOnboarding';

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
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, user_id: user.id, ...buildConsentPatch() }, { onConflict: 'id' });
      if (error) throw error;
      // Verificar persistencia antes de avanzar: una escritura puede
      // reportar éxito sin tocar filas (RLS) y avanzar igual reabriría el
      // interstitial en el próximo login («ya había aceptado»). Sin
      // evidencia leída no se navega: se muestra error y se permanece aquí.
      const { data: consentCheck } = await supabase
        .from('profiles')
        .select('terms_accepted_at, privacy_acknowledged_at')
        .eq('id', user.id)
        .maybeSingle();
      if (!hasLegalConsent(consentCheck)) {
        throw new Error('Tu aceptación no quedó registrada. Intenta nuevamente.');
      }
      // Cierre del bypass consent→destino: si aún no tiene tipo de cuenta,
      // pasa por el selector preservando el destino (nunca lo salta).
      // Ante error de lectura no se bloquea: se continúa al destino.
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (needsRoleSelection(profile, user as never)) {
          navigate(buildRoleOnboardingPath(dest === '/' ? null : dest), { replace: true });
          return;
        }
      } catch {
        /* continuar al destino */
      }
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
