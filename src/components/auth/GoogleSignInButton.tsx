import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  GoogleIcon,
  beginGoogleSignIn,
  type GoogleSignInRole,
} from '@/lib/googleAuth';
import { cn } from '@/lib/utils';

/**
 * FASE 4.60A — botón prominente "Continuar con Google" (auth solamente).
 * role lawyer SOLO cuando el formulario ya es de abogado (landings Pro/AI);
 * nunca admin, nunca desde query params.
 */
export function GoogleSignInButton({
  role,
  dark = false,
  requireConsent = false,
  consentGiven = true,
  onConsentMissing,
}: {
  role?: GoogleSignInRole;
  dark?: boolean;
  /** FASE 5.6: en signup se exige aceptación antes de iniciar OAuth. */
  requireConsent?: boolean;
  consentGiven?: boolean;
  onConsentMissing?: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    if (requireConsent && !consentGiven) {
      onConsentMissing?.();
      return;
    }
    setBusy(true);
    try {
      const { error } = await beginGoogleSignIn({ role });
      if (error) throw error;
      // Éxito = redirect a Google (Supabase maneja PKCE/state).
    } catch (e) {
      setBusy(false);
      toast({
        title: 'No se pudo iniciar sesión con Google',
        description: e instanceof Error ? e.message : 'Intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={busy}
        className={cn(
          'h-11 w-full gap-2 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50',
          dark && 'border-white/15 bg-white text-gray-900'
        )}
        aria-label="Continuar con Google"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <GoogleIcon />
        )}
        {busy ? 'Conectando…' : 'Continuar con Google'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Usaremos tu cuenta de Google solo para iniciar sesión.
      </p>
    </div>
  );
}
