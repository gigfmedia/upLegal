import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CaseCreatedPreviewProps = {
  createdAt: string;
  onOpen: () => void;
};

/**
 * Actividad reciente para tarjetas de casos SIN workspace AI vinculado.
 * Cero queries: deriva el evento canónico `case_created` de los props que la
 * tarjeta ya recibe. Misma gramática visual que AICaseTimelinePreview para
 * paridad legacy/Pro. El timeline completo vive en el detalle del caso.
 */
export function CaseCreatedPreview({ createdAt, onOpen }: CaseCreatedPreviewProps) {
  let relative = '';
  try {
    relative = formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es });
  } catch {
    relative = '';
  }

  return (
    <div className="mt-auto">
      <p className="mb-1.5 text-xs font-medium text-gray-500">
        Actividad reciente
      </p>
      <ul className="space-y-1.5">
        <li className="flex items-center gap-2">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
            aria-hidden="true"
          >
            <FolderPlus className="h-3 w-3" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">Caso creado</span>
        </li>
      </ul>
      {relative ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{relative}</p>
      ) : null}
      <Button
        type="button"
        variant="link"
        className="mt-1 h-auto p-0 text-xs font-medium text-green-700 hover:text-green-800"
        onClick={onOpen}
      >
        Ver timeline completo
      </Button>
    </div>
  );
}
