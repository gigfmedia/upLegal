import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHAT_SUGGESTIONS: string[] = [
  '¿Cuál es el principal riesgo del caso?',
  'Resume las obligaciones de cada parte.',
  '¿Qué información falta?',
  '¿Qué contradicciones encuentras?',
  'Explícame la cláusula más importante.',
];

type AIChatSuggestionsProps = {
  onSelect: (text: string) => void;
  disabled?: boolean;
};

export function AIChatSuggestions({ onSelect, disabled = false }: AIChatSuggestionsProps) {
  return (
    <div className="rounded-2xl border border-dashed border-green-200 bg-green-50/40 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <Lightbulb className="h-4 w-4 text-green-700" aria-hidden="true" />
        Puedes preguntar:
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHAT_SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(suggestion)}
            className="rounded-full border-green-200 bg-white text-xs text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-900"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
