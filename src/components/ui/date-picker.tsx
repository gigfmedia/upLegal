import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  className?: string
  placeholder?: string
  disabled?: (date: Date) => boolean
}

export function DatePicker({
  date,
  setDate,
  className,
  placeholder = "Selecciona una fecha",
  disabled
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Combine external disabled logic with Sunday check
  const isDayDisabled = (day: Date) => {
    // Disable Sundays (day 0)
    if (day.getDay() === 0) return true
    // Apply external disabled logic if provided
    if (disabled && disabled(day)) return true
    return false
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-between text-left font-normal px-3 py-2",
            !date && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: es }) : <span>{placeholder}</span>}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            setDate(selectedDate)
            setOpen(false) // Close popover when date is selected
          }}
          disabled={isDayDisabled}
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  )
}
