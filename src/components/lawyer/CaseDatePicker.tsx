import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** "8 oct 2026" — nunca ISO, nunca dd-mm-yyyy. */
export function formatCaseDateLabel(date: Date | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  try {
    return format(date, 'd MMM yyyy', { locale: es });
  } catch {
    return null;
  }
}

type Props = {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  ariaLabel: string;
  placeholder?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
};

/**
 * FASE 5.1B — selector de fecha integrado (Popover + Calendar shadcn).
 * Reemplaza al <input type="date"> nativo: nunca abre el picker del browser.
 * Español, semana desde lunes, con accesos "Hoy" y "Quitar fecha".
 */
export function CaseDatePicker({
  value,
  onChange,
  ariaLabel,
  placeholder = 'Seleccionar fecha',
  align = 'start',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const label = formatCaseDateLabel(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn(
            'h-9 w-auto shrink-0 justify-start gap-2 px-3 text-sm font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          <span>{label ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto max-w-[calc(100vw-2rem)] rounded-xl border p-0 shadow-lg"
      >
        <div className="p-1">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              onChange(d ?? undefined);
              if (d) setOpen(false);
            }}
            locale={es}
            weekStartsOn={1}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-medium"
            onClick={() => {
              onChange(new Date());
              setOpen(false);
            }}
          >
            Hoy
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              <X className="mr-1 h-3 w-3" aria-hidden="true" />
              Quitar fecha
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
