import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface ProfileCompletionProps {
  completion: number;
}

export function ProfileCompletion({ completion }: ProfileCompletionProps) {
  const getStatusColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    if (percentage < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusText = (percentage: number) => {
    if (percentage < 30) return 'Incompleto';
    if (percentage < 70) return 'En Progreso';
    if (percentage < 90) return 'Casi Listo';
    return 'Completo';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium">Estado del Perfil</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p>Completa tu perfil para aumentar tu visibilidad y ayudar a los clientes a encontrarte.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {completion}% - {getStatusText(completion)}
        </span>
      </div>
      <div className="space-y-1">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full w-full flex-1 transition-all ${getStatusColor(completion)}`}
            style={{ transform: `translateX(-${100 - completion}%)` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {completion < 100 
            ? `Completa el ${100 - completion}% restante de tu perfil` 
            : '¡Tu perfil está completo! 🎉'}
        </p>
      </div>
    </div>
  );
}
