import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AI_MODELS } from '@/lib/aiModels';
import { cn } from '@/lib/utils';

type Props = {
  model: string;
  onModelChange: (model: string) => void;
  disabled: boolean;
  className?: string;
};

/** Shared presentation for initial analysis, reanalysis and failed-analysis recovery. */
export function AIAnalysisModelSelect({ model, onModelChange, disabled, className }: Props) {
  return (
    <Select value={model} onValueChange={onModelChange} disabled={disabled}>
      <SelectTrigger className={cn('min-w-0 flex-1 text-left', className)} aria-label="Modelo de IA">
        <SelectValue placeholder="Modelo" />
      </SelectTrigger>
      <SelectContent>
        {AI_MODELS.map(option => (
          <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
