import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, parseISO, startOfDay, isPast, isToday, addDays } from 'date-fns';
import { es, enUS } from "date-fns/locale";
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

const DAYS_ENGLISH = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const normalizeDayKey = (value?: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

interface CalendarFieldProps {
  formData: {
    date: string | null;
    time: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    date: string | null;
    time: string;
  }>>;
  lawyerAvailability: {
    [key: string]: boolean[];
  } | null;
}

export default function CalendarField({ formData, setFormData, lawyerAvailability }: CalendarFieldProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const normalizedAvailability = useMemo(() => {
    if (!lawyerAvailability) return null;
    return Object.entries(lawyerAvailability).reduce<Record<string, boolean[]>>(
      (acc, [key, value]) => {
        if (!Array.isArray(value)) return acc;
        acc[normalizeDayKey(key)] = value;
        return acc;
      },
      {}
    );
  }, [lawyerAvailability]);

  const getDayAvailability = (date: Date): boolean[] | null => {
    if (!normalizedAvailability) return null;
    const dayIndex = date.getDay();
    const candidates = [DAYS_SPANISH[dayIndex], DAYS_ENGLISH[dayIndex]]
      .filter(Boolean)
      .map((key) => normalizedAvailability[normalizeDayKey(key as string)])
      .filter((value): value is boolean[] => Array.isArray(value));

    return candidates[0] || null;
  };

  const isDisabled = (date: Date): boolean => {
    if (isPast(date) && !isToday(date)) return true;

    if (!lawyerAvailability) return false;

    const dayAvailability = getDayAvailability(date);

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
            locale={enUS}
            className="p-3"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "flex items-center justify-center pt-1 mb-4 relative",
              caption_label: "text-sm font-medium",
              nav: "flex items-center gap-1",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-input rounded-md"
              ),
              nav_button_previous: "absolute left-0",
              nav_button_next: "absolute right-0",
              table: "w-full border-collapse",
              head_row: "grid grid-cols-7 gap-0 mb-1",
              head_cell:
                "text-muted-foreground font-normal text-[0.8rem] flex items-center justify-center h-9 capitalize",
              row: "grid grid-cols-7 gap-0 mt-0.5",
              cell: "h-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: cn(
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md flex items-center justify-center",
                "hover:bg-blue-100 hover:text-blue-900 transition-colors duration-200"
              ),
              day_selected: "bg-blue-500 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-500 focus:text-white",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}