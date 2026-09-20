import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';

type ActiveCapacityModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Canonical limit received from entitlement authority (no local literal). */
  limit: number;
};

/**
 * 4.36D — capacity-reached state for ACTIVE Pro lawyers at their active-case
 * limit. Deliberately distinct from the subscription paywall: this lawyer
 * already pays. No Ultra mention, no pricing, no upgrade path — close a
 * finished case to free a slot.
 */
export function ActiveCapacityModal({ open, onOpenChange, limit }: ActiveCapacityModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <FolderOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Límite de casos activos alcanzado</DialogTitle>
          <DialogDescription>
            Alcanzaste el límite de {limit} casos activos de tu plan. Cierra un
            caso que ya terminaste para poder abrir uno nuevo. Tus casos
            cerrados se conservan con todo su historial.
          </DialogDescription>
        </DialogHeader>
        <Button
          type="button"
          className="w-full bg-gray-900 hover:bg-green-900"
          onClick={() => onOpenChange(false)}
        >
          Entendido
        </Button>
      </DialogContent>
    </Dialog>
  );
}
