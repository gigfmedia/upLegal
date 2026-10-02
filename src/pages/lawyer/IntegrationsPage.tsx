import { GoogleCalendarConnect } from '@/components/dashboard/GoogleCalendarConnect';

/**
 * FASE 5.2D — /lawyer/integrations. Casa de las conexiones externas.
 * Google Calendar reutiliza su flujo OAuth existente sin duplicarlo.
 */
export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground">Conecta las herramientas que utilizas en tu trabajo diario.</p>
      </div>
      <GoogleCalendarConnect />
    </div>
  );
}
