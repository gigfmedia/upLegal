import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import {
  PASSWORD_SETUP_QUERY_KEY,
  markPasswordSetupComplete,
  usePasswordSetupState,
} from '@/hooks/usePasswordSetupState';
import { isPasswordStrong } from '@/lib/passwordValidation';

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/**
 * 4.53D — shared secure password management (lawyer + client settings).
 *
 * Authority split via server-controlled app_metadata.password_setup:
 * - setup_required (false) -> "Crear contraseña" (new + confirm, no current)
 * - setup_complete (true) / legacy_unknown (absent) -> "Cambiar contraseña"
 *   with GENUINE current verification via signInWithPassword before
 *   updateUser (the legacy field was never sent).
 *
 * Privacy: password values only ever go to Supabase Auth (updateUser /
 * signInWithPassword). Never logged, never analytics, never backend.
 */
export function SecurePasswordCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { state, refetch } = usePasswordSetupState();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clearFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const refreshAuthority = async () => {
    try {
      await supabase.auth.getUser();
    } catch {
      /* best effort; invalidation still refreshes */
    }
    void queryClient.invalidateQueries({ queryKey: PASSWORD_SETUP_QUERY_KEY });
    refetch();
  };

  /** Marker finalize with recoverable UX (§9): never claim full success silently. */
  const finalizeMarker = async (wasLegacy: boolean) => {
    const marked = await markPasswordSetupComplete();
    if (!marked) {
      toast({
        title: wasLegacy ? 'Contraseña actualizada.' : 'Contraseña creada.',
        description:
          'No pudimos registrar el cambio. Recarga la página e inténtalo de nuevo si el estado no se actualiza.',
        variant: 'destructive',
      });
    }
    await refreshAuthority();
    return marked;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden.', variant: 'destructive' });
      return;
    }
    if (!isPasswordStrong(newPassword)) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener entre 8 y 18 caracteres e incluir mayúscula, minúscula, número y símbolo.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setSubmitting(true);
      // Target identity comes exclusively from the current session.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      clearFields();
      const marked = await finalizeMarker(false);
      if (marked) {
        toast({
          title: 'Contraseña creada correctamente.',
          description: 'Ya puedes iniciar sesión con tu correo y contraseña.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear la contraseña.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden.', variant: 'destructive' });
      return;
    }
    if (!isPasswordStrong(newPassword)) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener entre 8 y 18 caracteres e incluir mayúscula, minúscula, número y símbolo.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setSubmitting(true);
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const email = currentUser?.email ?? user?.email ?? null;
      if (!email) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      // Genuine current-password verification (the legacy field never did this).
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        const msg = /invalid login credentials/i.test(verifyError.message)
          ? 'La contraseña actual no es correcta.'
          : verifyError.message;
        throw new Error(msg);
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      clearFields();
      // Legacy accounts graduate into explicit authority on verified change.
      if (state === 'legacy_unknown') {
        await finalizeMarker(true);
      } else {
        await refreshAuthority();
      }
      toast({ title: 'Contraseña actualizada correctamente.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Seguridad</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Fail-safe: never guess passwordless on authority failure.
  if (state === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Seguridad</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No pudimos verificar el estado de tu contraseña.
          </p>
          <Button type="button" variant="outline" onClick={refetch}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'setup_required') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Seguridad</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="text-sm font-medium">Crear contraseña</p>
            <p className="text-sm text-muted-foreground">
              Crea una contraseña para iniciar sesión también con tu correo y contraseña.
            </p>
            <PasswordField
              id="new-password"
              label="Nueva contraseña"
              placeholder="Ingresa nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              disabled={submitting}
              autoComplete="new-password"
            />
            <PasswordField
              id="confirm-password"
              label="Confirmar contraseña"
              placeholder="Confirma nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={submitting}
              autoComplete="new-password"
            />
            <Button type="submit" disabled={submitting} variant="outline" className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear contraseña'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Seguridad</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChange} className="space-y-4">
          <p className="text-sm font-medium">Cambiar contraseña</p>
          <PasswordField
            id="current-password"
            label="Contraseña actual"
            placeholder="Ingresa tu contraseña actual"
            value={currentPassword}
            onChange={setCurrentPassword}
            disabled={submitting}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-password"
            label="Nueva contraseña"
            placeholder="Ingresa nueva contraseña"
            value={newPassword}
            onChange={setNewPassword}
            disabled={submitting}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="Confirmar contraseña"
            placeholder="Confirma nueva contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={submitting}
            autoComplete="new-password"
          />
          <Button type="submit" disabled={submitting} variant="outline" className="w-full">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              'Cambiar contraseña'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
