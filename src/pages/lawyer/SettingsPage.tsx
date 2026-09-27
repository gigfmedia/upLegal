import { SecurePasswordCard } from '@/components/auth/SecurePasswordCard';
import { AccountDataExportCard } from '@/components/account/AccountDataExportCard';

/**
 * 4.53B — minimal lawyer Settings surface.
 * 4.54C — plus the only reusable real account feature (data export).
 * No 2FA (unimplemented), no deletion (fictitious + lawyer-unsafe),
 * no placeholder switches, no integrations (live elsewhere).
 */
export default function LawyerSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configuración de cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seguridad y acceso a tu cuenta de abogado.
        </p>
      </div>
      <SecurePasswordCard />
      <AccountDataExportCard />
    </div>
  );
}
