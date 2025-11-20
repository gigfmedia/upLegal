import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, parseISO, startOfDay, addDays, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const DAYS_SPANISH = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
];

interface CalendarFieldProps {
  formData: {
    date: string | null;
    time: string;
    // Agrega aquí otros campos que tenga formData
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    date: string | null;
    time: string;
    // Agrega aquí otros campos que tenga formData
  }>>;
  lawyerAvailability: {
    [key: string]: boolean[];
  } | null;
}

export default function CalendarField({ formData, setFormData, lawyerAvailability }: CalendarFieldProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getDayKey = (date: Date): string => DAYS_SPANISH[date.getDay()];

  const isDisabled = (date: Date): boolean => {
    // Deshabilitar fechas pasadas (excepto hoy)
    if (isPast(date) && !isToday(date)) return true;

    // Si no hay datos de disponibilidad, solo deshabilitar fechas pasadas
    if (!lawyerAvailability) return false;

    const dayKey = getDayKey(date);
    const dayAvailability = lawyerAvailability[dayKey];

    if (!dayAvailability || !Array.isArray(dayAvailability)) return true;

    return !dayAvailability.some((hourSlot) => hourSlot === true);
  };

  return (
    <div className="space-y-2">
      <Label>Fecha *</Label>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between text-left font-normal group",
              !formData.date && "text-muted-foreground",
              formData.date && "border-green-500 ring-green-500"
            )}
          >
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.date
                ? format(parseISO(formData.date), "PPP", { locale: es })
                : "Selecciona una fecha"}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isCalendarOpen && "rotate-180"
              )}
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-auto" align="start">
          <Calendar
            mode="single"
            selected={formData.date ? parseISO(formData.date) : undefined}
            onSelect={(date) => {
              if (!date) return;
              const dateStr = format(date, "yyyy-MM-dd");
              setFormData((prev) => ({
                ...prev,
                date: dateStr,
                time: "",
              }));
              setIsCalendarOpen(false);
            }}
            disabled={isDisabled}
            fromDate={startOfDay(new Date())}
            toDate={addDays(new Date(), 60)}
            locale={es}
            className="[&_.rdp-weekday]:hidden [&_.rdp-day]:rounded-md [&_.rdp-day_selected]:bg-blue-500 [&_.rdp-day_selected]:text-white [&_.rdp-day_selected:hover]:bg-blue-600 [&_.rdp-day_selected:focus]:bg-blue-600 [&_.rdp-day_selected:focus-visible]:bg-blue-600 [&_.rdp-day]:hover:bg-blue-100 [&_.rdp-day]:hover:text-blue-900 [&_.rdp-day]:transition-colors [&_.rdp-day]:duration-200"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
