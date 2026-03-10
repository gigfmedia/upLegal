import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00–18:00
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type AvailabilityMap = Record<string, boolean[]>;

interface AvailabilityStepProps {
  lawyerId: string;
  /** Called after a successful save so the wizard can know availability was saved */
  onSaved?: () => void;
}

export default function AvailabilityStep({ lawyerId, onSaved }: AvailabilityStepProps) {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [originalAvailability, setOriginalAvailability] = useState<AvailabilityMap>({});
  const [meetLink, setMeetLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [fillWeekdays, setFillWeekdays] = useState(false);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', lawyerId)
        .single();

      if (error) throw error;

      setMeetLink((data as any)?.meet_link || '');
      let saved: AvailabilityMap = {};
      if (data?.availability) {
        try {
          saved = typeof data.availability === 'string'
            ? JSON.parse(data.availability)
            : data.availability;
        } catch {
          saved = {};
        }
      }

      // Ensure all days exist
      const initialised: AvailabilityMap = {};
      DAYS.forEach((day) => {
        initialised[day] = saved[day] ?? HOURS.map(() => false);
      });

      setAvailability(initialised);
      setOriginalAvailability(initialised);
      setHasChanges(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la disponibilidad', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [lawyerId, toast]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  useEffect(() => {
    setHasChanges(JSON.stringify(availability) !== JSON.stringify(originalAvailability));
  }, [availability, originalAvailability]);

  // Fill weekdays checkbox
  useEffect(() => {
    setAvailability((prev) => {
      const next = { ...prev };
      for (let i = 0; i < 5; i++) {
        next[DAYS[i]] = HOURS.map(() => fillWeekdays);
      }
      return next;
    });
    setHasChanges(true);
  }, [fillWeekdays]);

  const toggleCell = (day: string, hourIndex: number) => {
    if (day === 'Domingo') return;
    setAvailability((prev) => {
      const dayArr = prev[day] ?? HOURS.map(() => false);
      return { ...prev, [day]: dayArr.map((v, i) => (i === hourIndex ? !v : v)) };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updatePayload: Record<string, unknown> = {
        availability: JSON.stringify(availability),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('user_id', lawyerId);

      if (error) throw error;

      setOriginalAvailability(availability);
      setHasChanges(false);
      toast({ title: '¡Listo!', description: 'Tu disponibilidad se guardó correctamente.' });
      onSaved?.();
    } catch (err: any) {
      console.error('Error saving availability:', err);
      const msg = err?.message || err?.details || err?.hint || 'No se pudo guardar la disponibilidad.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Zoom / Meet link */}
      <div className="space-y-1.5">
        <Label htmlFor="meet_link">Enlace de Google Meet</Label>
        <Input
          id="meet_link"
          type="url"
          value={meetLink}
          onChange={(e) => { setMeetLink(e.target.value); setHasChanges(true); }}
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
        />
        <p className="text-xs text-muted-foreground">
          Los clientes usarán este link para unirse a la videollamada contigo.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Selecciona los bloques horarios en los que estás disponible para atender citas.
        Puedes cambiarlo en cualquier momento desde tu perfil.
      </p>
      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px] grid grid-cols-8 gap-2">
          {/* Header row */}
          <div />
          {DAYS.map((day) => (
            <div key={day} className={`text-center font-medium text-xs pb-1 ${day === 'Domingo' ? 'text-gray-400' : ''}`}>
              {day}
            </div>
          ))}

          {/* Hour rows */}
          {HOURS.map((hour, hourIndex) => (
            <React.Fragment key={hour}>
              <div className="text-xs font-medium flex items-center text-muted-foreground">
                {String(hour).padStart(2, '0')}:00
              </div>
              {DAYS.map((day) => {
                const active = availability[day]?.[hourIndex];
                const disabled = day === 'Domingo' || (day === 'Sábado' && hour >= 15);
                return (
                  <button
                    key={day + hour}
                    type="button"
                    onClick={() => toggleCell(day, hourIndex)}
                    disabled={disabled}
                    className={`h-10 w-full rounded border transition-all flex items-center justify-center ${
                      disabled
                        ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                        : active
                        ? 'bg-blue-200 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    {active && !disabled && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      >
                        <CheckIcon className="w-4 h-4 text-blue-700" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Fill weekdays shortcut */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="fillWeekdays"
          checked={fillWeekdays}
          onChange={(e) => setFillWeekdays(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="fillWeekdays" className="text-sm text-gray-700">
          Marcar todas las horas de Lunes a Viernes
        </label>
        <span className="text-xs text-gray-400">(Sábado es opcional)</span>
      </div>

      {/* Save button */}
      <div className="pt-2">
        <Button onClick={save} disabled={saving || !hasChanges} className="w-full sm:w-auto">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando…</> : 'Guardar disponibilidad'}
        </Button>
      </div>
    </div>
  );
}
