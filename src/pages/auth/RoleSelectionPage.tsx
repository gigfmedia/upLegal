import { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from '@/contexts/AuthContext/clean/AuthContext';
import { sanitizePostAuthRedirect } from '@/lib/googleAuth';
import {
  getDefinedAccountRole,
  getRoleOnboardingDestination,
  isSelectableRole,
  needsRoleConfirmation,
  type SelectableRole,
} from '@/lib/roleOnboarding';
import {
  captureRoleOnboardingCompleted,
  captureRoleOnboardingRoleSelected,
  captureRoleOnboardingViewed,
} from '@/lib/proAnalytics';

/** Misma resolución que AuthModal: API express local o mismo origen. */
const resolveApiBaseUrl = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBase) {
    return envBase.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
};

/**
 * Onboarding simple post-registro: una sola pantalla para elegir tipo de
 * cuenta. Se llega solo desde AuthCallback/ConsentPage cuando el usuario no
 * tiene rol elegido conscientemente; si ya lo eligió, redirige sin
 * mostrarse (recargas incluidas). Un 'client' por defecto del trigger de
 * Auth (sin timestamps ni corroboración) no cuenta como elegido.
 * ConsentPage y AuthCallback propagan esa decisión vía location.state
 * (needsRoleChoice).
 * Persiste vía POST /api/profile/role (validación en servidor, idempotente).
 */
export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [selected, setSelected] = useState<SelectableRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // H1: un retorno hacia infraestructura auth (p. ej. redirectTo=/auth/role)
  // dejaría un spinner infinito (navegación replace a sí misma sin re-montar)
  // o re-mostraría el formulario tras guardar. Se trata como nulo.
  // '/': valor por defecto de beginGoogleSignIn desde la home, sin destino
  // explícito → aplican los destinos por rol (/search, /lawyer/onboarding),
  // nunca la home como «destino post-onboarding».
  const rawRedirect = sanitizePostAuthRedirect(params.get('redirectTo'));
  const safeRedirect =
    rawRedirect && (rawRedirect.startsWith('/auth/') || rawRedirect === '/') ? null : rawRedirect;

  // Marca de la cadena de onboarding (location.state, no URL): el decisor
  // (callback o consentimiento) ya determinó con el estado previo que falta
  // elección. La pantalla reevalúa con timestamps ya presentes y sin esta
  // marca redirigiría sin mostrar el formulario.
  const location = useLocation();
  const needsRoleChoice =
    (location.state as { needsRoleChoice?: boolean } | null)?.needsRoleChoice === true;
  // Refresco de sesión post-guardado (menú): sin provider es undefined.
  const authCtx = useContext(AuthContext);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        navigate('/?login=true', { replace: true });
        return;
      }
      // H3: misma clave que AuthCallback y el resto de la app (user_id).
      // Se leen también los timestamps: la regla one-shot los necesita.
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, terms_accepted_at, privacy_acknowledged_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      // Un 'client' por defecto del trigger (sin timestamps ni elección
      // corroborada) NO cuenta como elegido: se muestra el formulario.
      // Con rol elegido (o administrativo): no mostrar de nuevo.
      if (!needsRoleChoice && !needsRoleConfirmation(profile, user as never)) {
        // Ya definido (o administrativo): no mostrar de nuevo.
        const defined = getDefinedAccountRole(profile, user as never);
        navigate(
          getRoleOnboardingDestination(
            defined === 'lawyer' ? 'lawyer' : 'client',
            safeRedirect,
          ),
          { replace: true },
        );
        return;
      }
      setUserId(user.id);
      setChecking(false);
      try {
        captureRoleOnboardingViewed(user.id);
      } catch {
        // analytics nunca bloquea
      }
    })();
    return () => {
      cancelled = true;
    };
    // safeRedirect deriva de la URL inicial; no re-evaluar por cambios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleSelect = (value: string) => {
    if (!isSelectableRole(value)) return;
    setSelected(value);
    setError(null);
    try {
      if (userId) captureRoleOnboardingRoleSelected(userId, value);
    } catch {
      // noop
    }
  };

  const handleContinue = async () => {
    if (!selected || saving || !userId) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        navigate('/?login=true', { replace: true });
        return;
      }
      const apiBase = resolveApiBaseUrl();
      const response = await fetch(`${apiBase}/api/profile/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selected }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'No se pudo guardar tu selección.');
      }
      // El servidor es la autoridad: solo se navega con el rol que confirma
      // haber persistido. Un rol ausente o inesperado es error recuperable,
      // nunca navegación silenciosa con el valor pedido.
      const savedRole: SelectableRole | null = isSelectableRole(result?.role) ? result.role : null;
      if (!savedRole) {
        throw new Error('No se pudo confirmar tu selección. Intenta nuevamente.');
      }
      try {
        captureRoleOnboardingCompleted(userId, savedRole);
      } catch {
        // noop
      }
      try {
        // Refresca sesión + perfil para que el menú muestre el rol nuevo
        // sin depender de estado obsoleto (sin provider es no-op).
        await authCtx?.checkSession();
      } catch {
        // La persistencia ya está confirmada; el menú se actualiza en la
        // próxima carga.
      }
      navigate(getRoleOnboardingDestination(savedRole, safeRedirect), { replace: true });
    } catch (e) {
      // Error claro + reintento: el usuario NO queda bloqueado.
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu selección. Intenta nuevamente.');
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Scale className="h-8 w-8 text-green-900" />
            <span className="text-xl font-bold text-gray-900">LegalUp</span>
          </div>
          <CardTitle className="text-2xl">Bienvenido a LegalUp</CardTitle>
          <p className="mt-2 text-sm text-gray-500">
            Para comenzar, cuéntanos qué necesitas hacer
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <RadioGroup
            value={selected ?? ''}
            onValueChange={handleSelect}
            aria-label="Tipo de cuenta"
          >
            <Label
              htmlFor="role-lawyer"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                selected === 'lawyer'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <RadioGroupItem id="role-lawyer" value="lawyer" className="mt-1" />
              <span>
                <span className="block font-medium text-gray-900">Soy abogado/a</span>
                <span className="block text-sm text-gray-500">
                  Quiero ofrecer mis servicios jurídicos y acceder a herramientas para mi estudio.
                </span>
              </span>
            </Label>
            <Label
              htmlFor="role-client"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                selected === 'client'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <RadioGroupItem id="role-client" value="client" className="mt-1" />
              <span>
                <span className="block font-medium text-gray-900">Busco un abogado/a</span>
                <span className="block text-sm text-gray-500">
                  Necesito asesoría jurídica para mi caso.
                </span>
              </span>
            </Label>
          </RadioGroup>
          <Button
            onClick={handleContinue}
            disabled={!selected || saving}
            className="h-11 w-full bg-gray-900 text-white hover:bg-green-900"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
              </>
            ) : (
              'Continuar'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
