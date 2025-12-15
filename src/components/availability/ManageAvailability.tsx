import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, CheckIcon, X } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00–20:00
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function AvailabilityGrid({ lawyerId, onClose, onAvailabilityChange }) {
  const { toast } = useToast();
  const [availability, setAvailability] = useState({});
  const [originalAvailability, setOriginalAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Function to load availability data
  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", lawyerId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (data?.availability) {
        // Ensure we have the correct data structure
        let savedAvailability = {};
        try {
          savedAvailability = typeof data.availability === 'string' 
            ? JSON.parse(data.availability)
            : data.availability;
        } catch (e) {
          console.error('Error parsing availability JSON:', e, data.availability);
          // Fallback to empty if parse fails
          savedAvailability = {};
        }
          
        setAvailability(savedAvailability || {});
        setOriginalAvailability(savedAvailability || {});
        setHasChanges(false);
      } else {
        // Initialize with all days and hours set to false
        const empty = {};
        DAYS.forEach((day) => {
          empty[day] = HOURS.map(() => false);
        });
        setAvailability(empty);
        setOriginalAvailability(empty);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la disponibilidad',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [lawyerId, toast]);

  // Load availability when component mounts
  useEffect(() => {
    if (lawyerId) {
      loadAvailability();
    }
  }, [lawyerId, loadAvailability]);

  const toggleCell = (day, hourIndex) => {
    if (day === "Domingo") return; // Domingo no editable

    setAvailability((prev) => {
      // Ensure the day exists in the state
      const dayAvailability = prev[day] || HOURS.map(() => false);
      const newAvailability = {
        ...prev,
        [day]: dayAvailability.map((v, i) => (i === hourIndex ? !v : v)),
      };
      return newAvailability;
    });
    
    // Mark as having changes
    setHasChanges(true);
  };

  // Check if availability has changed
  useEffect(() => {
    const hasChanged = JSON.stringify(availability) !== JSON.stringify(originalAvailability);
    setHasChanges(hasChanged);
  }, [availability, originalAvailability]);

  const [fillWeekdays, setFillWeekdays] = useState(false);
  useEffect(() => {
    if (fillWeekdays) {
      // Fill Monday to Friday (index 0 to 4)
      setAvailability(prev => {
        const newAvailability = { ...prev };
        for (let i = 0; i < 5; i++) {
          newAvailability[DAYS[i]] = HOURS.map(() => true);
        }
        return newAvailability;
      });
      setHasChanges(true);
    } else {
      // Clear all hours when unchecked
      setAvailability(prev => {
        const newAvailability = { ...prev };
        // Clear Monday to Friday (index 0 to 4)
        for (let i = 0; i < 5; i++) {
          newAvailability[DAYS[i]] = HOURS.map(() => false);
        }
        return newAvailability;
      });
      setHasChanges(true);
    }
  }, [fillWeekdays]);

  const save = async () => {
    setSaving(true);
    
    try {
      // Use the same approach as updateProfile in AuthContext
      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', lawyerId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
        throw fetchError;
      }
      
      let result;
      if (existingProfile) {
        // Update existing profile
        const updateData = {
          ...existingProfile,
          availability: availability,
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', lawyerId)
          .select()
          .single();
          
        result = { data, error };
      } else {
        // Create new profile
        const newProfileData = {
          user_id: lawyerId,
          availability: availability,
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('profiles')
          .insert(newProfileData)
          .select()
          .single();
          
        result = { data, error };
      }
      
      if (result.error) {
        console.error('Save error:', result.error);
        throw result.error;
      }
      
      // Update original availability after successful save
      setOriginalAvailability(availability);
      setHasChanges(false);
      
      // Notify parent component that availability has changed
      if (onAvailabilityChange) {
        onAvailabilityChange();
      }
      
      toast({ 
        title: "¡Listo!", 
        description: "Tu disponibilidad se ha guardado correctamente" 
      });
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({ 
        title: "Error", 
        description: "No se pudo guardar la disponibilidad. Por favor, inténtalo de nuevo.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-8 gap-3 rounded-lg bg-white">
        <div></div>
        {DAYS.map((day) => (
          <div
            key={day}
            className={`text-center font-medium text-sm ${
              day === "Domingo" ? "text-gray-400" : ""
            }`}
          >
            {day}
          </div>
        ))}

        {HOURS.map((hour, hourIndex) => (
          <React.Fragment key={hour}>
            <div className="text-sm font-medium flex items-center">
              {String(hour).padStart(2, "0")}:00
            </div>

            {DAYS.map((day) => {
              const active = availability[day]?.[hourIndex];
              const isSunday = day === "Domingo";

              return (
                <button
                  key={day + hour}
                  onClick={() => toggleCell(day, hourIndex)}
                  disabled={isSunday || (day === "Sábado" && hour >= 15)}
                  className={`
                    h-12 w-full rounded-md border relative transition-all flex items-center justify-center
                    ${isSunday || (day === "Sábado" && hour >= 15)
                      ? "bg-gray-200 border-gray-300 cursor-not-allowed"
                      : active
                      ? "bg-blue-200 border-blue-500"
                      : "bg-gray-50 hover:bg-gray-100 border-gray-300"}
                  `}
                >
                  {active && !isSunday && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <CheckIcon className="w-5 h-5 text-blue-700" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-4 flex items-center space-x-2">
        <input
          type="checkbox"
          id="fillWeekdays"
          checked={fillWeekdays}
          onChange={(e) => setFillWeekdays(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label 
          htmlFor="fillWeekdays" 
          className="text-sm text-gray-700"
        >
          Llenar todas las horas de Lunes a Viernes
        </label>
        <span className="text-xs text-gray-500 ml-2">(Sábado es opcional)</span>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cerrar
        </Button>
        <Button onClick={save} disabled={saving || !hasChanges} className="flex-1">
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}

export default function ManageAvailability({ lawyerId, isEditing, onAvailabilityChange }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [modalKey, setModalKey] = React.useState(0);

  // Reset the component when modal opens
  const handleOpenChange = (open) => {
    if (open) {
      // Increment key to force re-render and reload data
      setModalKey(prev => prev + 1);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto"
          disabled={!isEditing}
        > 
          <Calendar className="mr-2 h-4 w-4" />
          Gestionar disponibilidad
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 rounded-none sm:rounded-lg">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>Gestionar disponibilidad semanal</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Selecciona los horarios en los que estás disponible para atender citas
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="px-8 py-6 max-h-[calc(90vh-180px)] w-full">
          <AvailabilityGrid 
            key={modalKey}
            lawyerId={lawyerId} 
            onClose={() => setIsOpen(false)}
            onAvailabilityChange={onAvailabilityChange}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}