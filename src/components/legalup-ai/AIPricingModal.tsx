import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';

/** Compatibility entry point: current acquisition always uses the canonical Pro offer. */
export function AIPricingModal(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <ProPricingModal {...props} triggerAction="legacy_ai_surface" />;
}
