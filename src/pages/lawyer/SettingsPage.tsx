import { SecurePasswordCard } from '@/components/auth/SecurePasswordCard';

/**
 * 4.53B — minimal lawyer Settings surface.
 * Currently hosts account security (password setup/change). Lawyers
 * previously had no password-management UI at all.
 */
export default function LawyerSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seguridad y acceso a tu cuenta de abogado.
        </p>
      </div>
      <SecurePasswordCard />
    </div>
  );
}
