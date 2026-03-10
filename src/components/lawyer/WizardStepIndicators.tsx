import { Check } from 'lucide-react';

export type WizardStep = {
  id: number;
  name: string;
  description: string;
};

interface WizardStepIndicatorsProps {
  currentStep: number;
  steps: WizardStep[];
}

export function WizardStepIndicators({ currentStep, steps }: WizardStepIndicatorsProps) {
  return (
    <div className="flex items-center justify-center gap-2 max-w-full">
      {steps.map((s, idx) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              s.id < currentStep
                ? 'bg-green-500 text-white'
                : s.id === currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {s.id < currentStep ? <Check className="h-4 w-4" /> : s.id}
          </div>
          <span
            className={`text-sm hidden sm:block whitespace-nowrap ${
              s.id === currentStep ? 'font-medium' : 'text-muted-foreground'
            }`}
          >
            {s.name}
          </span>
          {idx < steps.length - 1 && (
            <div
              className={`h-px w-8 sm:w-12 ${
                s.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
