import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { isChileanHoliday } from '@/lib/holidays';

type AppointmentType = 'video' | 'phone' | 'in_person';

interface AppointmentFormProps {
  initialData: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    service: string;
    date: string;
    time: string;
    duration: string;
    type: AppointmentType;
    notes?: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function AppointmentForm({ initialData, onSubmit, onCancel, isEditing = false }: AppointmentFormProps) {
  const [formData, setFormData] = useState(initialData);

  const [dateCarouselIndex, setDateCarouselIndex] = useState(0);

  const availableDates = useMemo(() => {
    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(now), i));
    return dates
      .filter(date => date.getDay() !== 0)
      .filter(date => !isChileanHoliday(date));
  }, []);

  const visibleDates = useMemo(() => availableDates.slice(dateCarouselIndex, dateCarouselIndex + 5), [availableDates, dateCarouselIndex]);
  const visibleMonth = visibleDates[0] ? format(visibleDates[0], 'MMMM yyyy', { locale: es }) : '';

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  const [timeCarouselIndex, setTimeCarouselIndex] = useState(0);
  const visibleTimeSlots = useMemo(() => timeSlots.slice(timeCarouselIndex, timeCarouselIndex + 5), [timeSlots, timeCarouselIndex]);

  useEffect(() => {
    if (availableDates.length === 0) return;
    const isValid = formData.date && availableDates.some(d => format(d, 'yyyy-MM-dd') === formData.date);
    if (!isValid) {
      const first = availableDates[0];
      setFormData(prev => ({ ...prev, date: format(first, 'yyyy-MM-dd') }));
    }
  }, [availableDates]);

  useEffect(() => {
    if (!formData.date || availableDates.length === 0) return;
    const idx = availableDates.findIndex(d => format(d, 'yyyy-MM-dd') === formData.date);
    if (idx !== -1) {
      const newIndex = Math.floor(idx / 5) * 5;
      setDateCarouselIndex(prev => prev !== newIndex ? newIndex : prev);
    }
  }, [formData.date, availableDates]);

  useEffect(() => {
    if (!formData.time) return;
    const idx = timeSlots.findIndex(t => t === formData.time);
    if (idx !== -1) {
      const newIndex = Math.floor(idx / 5) * 5;
      setTimeCarouselIndex(prev => prev !== newIndex ? newIndex : prev);
    }
  }, [formData.time, timeSlots]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientName">Nombre del Cliente</Label>
          <Input
            id="clientName"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="clientEmail">Correo Electrónico</Label>
          <Input
            id="clientEmail"
            name="clientEmail"
            type="email"
            value={formData.clientEmail}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="clientPhone">Teléfono</Label>
          <Input
            id="clientPhone"
            name="clientPhone"
            type="tel"
            value={formData.clientPhone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="service">Servicio</Label>
          <Input
            id="service"
            name="service"
            value={formData.service}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-4 md:col-span-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fecha</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize text-gray-700">{visibleMonth}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDateCarouselIndex(prev => Math.max(0, prev - 5))}
                    disabled={dateCarouselIndex === 0}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateCarouselIndex(prev => Math.min(availableDates.length - 5, prev + 5))}
                    disabled={dateCarouselIndex + 5 >= availableDates.length}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {visibleDates.map((date) => (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    setFormData(prev => ({ ...prev, date: dateStr, time: '' }));
                  }}
                  className={`p-3 border-2 rounded-lg text-center transition-all ${formData.date === format(date, 'yyyy-MM-dd') ? 'border-green-900 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="text-xs text-gray-500">{format(date, 'EEE', { locale: es })}</div>
                  <div className="text-lg font-semibold">{format(date, 'd', { locale: es })}</div>
                  <div className="text-xs text-gray-500">{format(date, 'MMM', { locale: es })}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horario</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTimeCarouselIndex(prev => Math.max(0, prev - 5))}
                  disabled={timeCarouselIndex === 0}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTimeCarouselIndex(prev => Math.min(timeSlots.length - 5, prev + 5))}
                  disabled={timeCarouselIndex + 5 >= timeSlots.length}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            {formData.date ? (
              <div className="grid grid-cols-5 gap-2">
                {visibleTimeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, time }))}
                    className={`p-3 border-2 rounded-lg transition-all ${formData.time === time ? 'border-green-900 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Selecciona una fecha primero</p>
            )}
          </div>
          <input type="hidden" name="date" value={formData.date} required />
          <input type="hidden" name="time" value={formData.time} required />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duration">Duración</Label>
          <select
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="60">1 hora</option>
            <option value="90">1 hora 30 minutos</option>
            <option value="120">2 horas</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type">Tipo de Cita</Label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="video">Videollamada</option>
            <option value="phone">Llamada telefónica</option>
            <option value="in_person">Reunión presencial</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas Adicionales</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">
          {isEditing ? 'Guardar Cambios' : 'Crear Cita'}
        </Button>
      </div>
    </form>
  );
}
