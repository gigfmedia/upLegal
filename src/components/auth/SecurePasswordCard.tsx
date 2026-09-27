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
import { AUTH_PASSWORD_QUERY_KEY, useHasAuthPassword } from '@/hooks/useHasAuthPassword';
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
 * 4.53B — shared secure password management (lawyer + client settings).
 *
 * Authority split via public.has_auth_password() (caller-only RPC):
 * - no password  -> "Crear contraseña" (new + confirm, no current field)
 * - has password -> "Cambiar contraseña" (current GENUINELY verified via
 *   signInWithPassword before updateUser; the old field was never sent).
 *
 * Privacy: password values only ever go to Supabase Auth (updateUser /
 * signInWithPassword). Never logged, never analytics, never backend.
 */
export function SecurePasswordCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasPassword, isLoading, isError, refetch } = useHasAuthPassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clearFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const refreshAuthority = () => {
    void queryClient.invalidateQueries({ queryKey: AUTH_PASSWORD_QUERY_KEY });
    refetch();
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
      // Convenience/audit metadata only — never password-state authority.
      try {
        await supabase.auth.updateUser({ data: { password_setup_at: new Date().toISOString() } });
      } catch {
        /* metadata must not break creation */
      }
      clearFields();
      refreshAuthority();
      toast({
        title: 'Contraseña creada correctamente.',
        description: 'Ya puedes iniciar sesión con tu correo y contraseña.',
      });
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
      refreshAuthority();
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

  if (isLoading) {
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

  // Fail-safe: never guess "no password" on authority failure.
  if (isError || hasPassword === null) {
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

  if (!hasPassword) {
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
