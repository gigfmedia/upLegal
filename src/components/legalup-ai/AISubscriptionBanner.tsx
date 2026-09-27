import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAISubscription } from '@/hooks/useAISubscription';
import { AIPricingModal } from './AIPricingModal';

/** Legacy compatibility banner; never offers a new standalone subscription. */
export function AISubscriptionBanner() {
  const sub = useAISubscription();
  const [open, setOpen] = useState(false);
  if (sub.hasAccess) return null;
  return <>
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">LegalUp AI trabaja dentro de tus casos</p>
        <p className="text-sm text-muted-foreground">Tu primer caso incluye usos limitados de IA. LegalUp Pro amplía la capacidad y ofrece uso mensual.</p>
      </div>
      <Button onClick={() => setOpen(true)}>Ver LegalUp Pro</Button>
    </div>
    <AIPricingModal open={open} onOpenChange={setOpen} />
  </>;
}
