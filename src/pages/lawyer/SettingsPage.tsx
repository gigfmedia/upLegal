import { SecurePasswordCard } from '@/components/auth/SecurePasswordCard';
import { AccountDataExportCard } from '@/components/account/AccountDataExportCard';
import { ProSubscriptionCard } from '@/components/legalup-pro/ProSubscriptionCard';

/**
 * 4.53B — minimal lawyer Settings surface.
 * 4.54C — plus the only reusable real account feature (data export).
 * 4.57D — subscription management (Pro/Plus tier, upgrade, scheduled
 * downgrade, cancel). Server is the authority; this only displays + calls.
 * No 2FA (unimplemented), no deletion (fictitious + lawyer-unsafe),
 * no placeholder switches, no integrations (live elsewhere).
 */
export default function LawyerSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configuración de cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suscripción, seguridad y acceso a tu cuenta de abogado.
        </p>
      </div>
      <ProSubscriptionCard />
      <SecurePasswordCard />
      <AccountDataExportCard />
    </div>
  );
}
