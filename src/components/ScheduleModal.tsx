import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Video, Check, Clock, ExternalLink, X, ChevronDown, Calendar as CalendarIcon  } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ValidatedInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { generateGoogleMeetLink, formatMeetLink, isValidMeetUrl } from "@/lib/googleMeet";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, startOfDay, isSameDay, addDays, isBefore, isPast, isToday, isValid } from 'date-fns';
import { es, enUS } from "date-fns/locale";
import { createMercadoPagoPayment } from '@/services/mercadopagoService';
import { fetchPlatformSettings, getDefaultPlatformSettings } from '@/services/platformSettings';
import { isChileanHoliday } from '@/lib/holidays';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawyerName: string;
  hourlyRate: number;
  lawyerId: string;
}

// Helper function to format date as YYYY-MM-DD
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

function normalizeCalendarDate(date?: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
}

const parseLocalDateString = (dateString?: string) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);

  if ([year, month, day].some((value) => Number.isNaN(value))) {
    return null;
  }

  return normalizeCalendarDate(new Date(year, (month || 1) - 1, day || 1));
};

const getNextBookableDate = (referenceDate = new Date()) => {
  const date = startOfDay(referenceDate);

  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return normalizeCalendarDate(date) ?? date;
};

// Format currency helper function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

type LawyerAvailabilityMap = Record<string, boolean[]>;

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

const AVAILABILITY_START_HOUR = 9;
const DEFAULT_SLOT_DURATION_MINUTES = 60;

const normalizeDayKey = (value?: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

const normalizeAvailabilityMap = (
  availability: LawyerAvailabilityMap | null
): Record<string, boolean[]> | null => {
  if (!availability) return null;

  const normalizedEntries = Object.entries(availability).reduce<Record<string, boolean[]>>(
    (acc, [key, value]) => {
      if (!Array.isArray(value)) return acc;
      acc[normalizeDayKey(key)] = value;
      return acc;
    },
    {}
  );

  return Object.keys(normalizedEntries).length ? normalizedEntries : null;
};

const findAvailabilityForDate = (
  normalizedMap: Record<string, boolean[]> | null,
  date: Date
): boolean[] | null => {
  if (!normalizedMap || Number.isNaN(date.getTime())) return null;

  const dayIndex = date.getDay();
  const candidates = [
    DAYS_SPANISH[dayIndex],
    DAYS_ENGLISH[dayIndex],
    format(date, "EEEE", { locale: es }),
    format(date, "EEEE", { locale: enUS })
  ].filter(Boolean);

  for (const candidate of candidates) {
    const key = normalizeDayKey(candidate as string);
    if (normalizedMap[key]) {
      return normalizedMap[key];
    }
  }

  return null;
};

const buildSlotsFromAvailability = (
  dayAvailability: boolean[],
  bookedTimes: string[] = [],
  slotDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES
) => {
  const bookedSet = new Set(bookedTimes.filter(Boolean));

  return dayAvailability.reduce<Array<{ value: string; label: string }>>(
    (acc, isAvailable, index) => {
      if (!isAvailable) return acc;

      const startHour = AVAILABILITY_START_HOUR + index;
      const slotStart = `${String(startHour).padStart(2, "0")}:00`;

      if (bookedSet.has(slotStart)) return acc;

      let endHour = startHour;
      let remainingMinutes = slotDurationMinutes;

      while (remainingMinutes >= 60) {
        endHour += 1;
        remainingMinutes -= 60;
      }

      const slotEnd = `${String(endHour).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;

      acc.push({
        value: slotStart,
        label: `${slotStart} - ${slotEnd}`,
      });

      return acc;
    },
    []
  );
};

// Using the same specialties as in SearchResults.tsx
const SPECIALTIES = [
  "Derecho Civil",
  "Derecho Penal",
  "Derecho Laboral",
  "Derecho de Familia",
  "Derecho Comercial",
  "Derecho Tributario",
  "Derecho Inmobiliario",
  "Derecho de Salud",
  "Derecho Ambiental",
  "Derecho de Consumidor",
  "Derecho Administrativo",
  "Derecho Procesal",
  "Derecho de Propiedad Intelectual",
  "Derecho de Seguridad Social",
  "Derecho Minero",
  "Derecho Aduanero",
  "Derecho Marítimo",
  "Derecho Aeronáutico",
  "Derecho Deportivo"
];

interface Lawyer {
  id: string;
  name: string;
  hourly_rate: number;
  specialty: string;
  avatar_url?: string;
}

// CalendarField component integrated directly
interface AppointmentFormData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  duration: string;
  consultationType: string;
  contactMethod: string;
  description: string;
  address: string;
}

interface CalendarFieldProps {
  formData: AppointmentFormData;
  onDateSelect: (date: string) => void;
  lawyerAvailability: LawyerAvailabilityMap | null;
  selectedLawyerId: string;
}

const CalendarField = ({ formData, onDateSelect, lawyerAvailability }: CalendarFieldProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const normalizedAvailability = useMemo(
    () => normalizeAvailabilityMap(lawyerAvailability),
    [lawyerAvailability]
  );

  const getDayAvailability = useCallback(
    (date: Date) => findAvailabilityForDate(normalizedAvailability, date),
    [normalizedAvailability]
  );
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const initialParsed = formData.date ? parseLocalDateString(formData.date) : null;
    return normalizeCalendarDate(initialParsed ?? new Date()) ?? new Date();
  });

  useEffect(() => {
    const parsed = formData.date ? parseLocalDateString(formData.date) : null;
    const normalized = normalizeCalendarDate(parsed);
    if (normalized) {
      setSelectedDate(normalized);
    }
  }, [formData.date]);

  // Function to check if a date is disabled based on lawyer availability
  const isDateDisabled = useCallback((date: Date): boolean => {
    const normalizedDate = normalizeCalendarDate(date);
    if (!normalizedDate) return true;

    // First, check if the date is in the past
    const today = startOfDay(new Date());
    const dateToCheck = startOfDay(normalizedDate);

    if (isBefore(dateToCheck, today)) {
      return true; // Disable past dates
    }

    // Disable Sundays explicitly
    if (dateToCheck.getDay() === 0) {
      return true;
    }

    // Disable Chilean holidays
    if (isChileanHoliday(dateToCheck)) {
      return true;
    }

    const dayAvailability = getDayAvailability(normalizedDate);

    if (!dayAvailability) return false;

    return !dayAvailability.some((hour) => hour === true);
  }, [getDayAvailability]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const normalizedDate = normalizeCalendarDate(date);
    if (!normalizedDate) return;

    setSelectedDate(normalizedDate);
    
    const formattedDate = format(normalizedDate, 'yyyy-MM-dd');
    
    onDateSelect(formattedDate);
    setIsCalendarOpen(false);
  };

  // Formatear la fecha para mostrar sin problemas de zona horaria
  const displayDate = formData.date ? normalizeCalendarDate(parseLocalDateString(formData.date)) : null;

  return (
    <div className="space-y-2">
      <Label htmlFor="date">Fecha *</Label>
      <div className="relative">
        <DatePicker 
          date={selectedDate}
          setDate={handleDateSelect}
          disabled={isDateDisabled}
          className={formData.date ? "border-green-500 ring-0.5 ring-green-500" : ""}
        />
        {formData.date && (
          <Check 
            className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500 pointer-events-none" 
            aria-hidden="true"
            strokeWidth={3}
          />
        )}
      </div>
    </div>
  );
};

export function ScheduleModal({ isOpen, onClose, lawyerName, hourlyRate, lawyerId }: ScheduleModalProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasLoadedLawyers = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedLawyer, setSelectedLawyer] = useState<string | null>(lawyerId || null);
  const [selectedLawyerData, setSelectedLawyerData] = useState<Lawyer | null>(null);
  const [isLoadingLawyers, setIsLoadingLawyers] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>(SPECIALTIES);
  const [lawyerAvailability, setLawyerAvailability] = useState<LawyerAvailabilityMap | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{ value: string; label: string }>>([]);
  const [platformSettings, setPlatformSettings] = useState(getDefaultPlatformSettings());
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  
  // Normalized availability for the selected lawyer
  const normalizedAvailability = useMemo(
    () => normalizeAvailabilityMap(lawyerAvailability),
    [lawyerAvailability]
  );

  // Get availability for a specific date string
  const getDayAvailabilityForDateString = useCallback(
    (dateString: string) => {
      if (!normalizedAvailability) return null;
      const date = parseLocalDateString(dateString);
      if (!date) return null;
      return findAvailabilityForDate(normalizedAvailability, date);
    },
    [normalizedAvailability]
  );
  
  // CORRECCIÓN: Mover el hook useToast antes de cualquier condicional
  const { toast } = useToast();
  
  // CORRECCIÓN: Mover la detección de ruta después de los hooks
  const isAppointmentsPage = typeof window !== 'undefined' && window.location.pathname === '/dashboard/appointments';

  // Refs for focus management
  const specialtySelectRef = useRef<HTMLButtonElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Load platform fee settings once modal mounts
  useEffect(() => {
    let isMounted = true;
    fetchPlatformSettings()
      .then(settings => {
        if (isMounted) {
          setPlatformSettings(settings);
        }
      })
      .catch(err => {
        console.error('Failed to load platform settings in ScheduleModal:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize form data with user information if available
  const [formData, setFormData] = useState(() => {
    // Get user's full name from either user_metadata or profile
    const fullName = user?.user_metadata?.full_name || 
                    (user?.user_metadata?.first_name && user.user_metadata.last_name 
                      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` 
                      : '');
    
    // Get phone number from profile or user_metadata
    const phone = user?.phone || 
                 user?.user_metadata?.phone || 
                 '';
    
    // Get email from user object
    const email = user?.email || '';
    
    const initialDate = getNextBookableDate();

    return {
      name: fullName,
      email: email,
      phone: phone,
      date: format(initialDate, 'yyyy-MM-dd'), // Skip Sundays by default
      time: "",
      duration: "60",
      consultationType: "consultation",
      contactMethod: "videollamada", // Default to videocall
      description: "",
      address: "" // Add address field for presential meetings
    };
  });

  const [googleBusySlots, setGoogleBusySlots] = useState<{ start: string; end: string }[]>([]);

  // Fetch Google Busy Slots
  useEffect(() => {
    const fetchGoogleBusySlots = async () => {
      if (!formData.date || !lawyerId) return;

      try {
        const date = parseLocalDateString(formData.date);
        if (!date) return;

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase.functions.invoke('get-google-busy-slots', {
          body: {
            lawyerId: lawyerId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          }
        });

        if (error) throw error;
        setGoogleBusySlots(data.busySlots || []);
      } catch (error) {
        console.error('Error fetching Google busy slots:', error);
        // Don't block booking if this fails, just log it
        setGoogleBusySlots([]);
      }
    };

    fetchGoogleBusySlots();
  }, [formData.date, lawyerId]);

  // CORRECCIÓN: Inicializar selectedLawyerData cuando se abre el modal desde una tarjeta
  useEffect(() => {
    if (isOpen && lawyerId && !isAppointmentsPage) {
      // Cuando se abre desde una tarjeta, establecer el abogado seleccionado
      setSelectedLawyer(lawyerId);
      setSelectedLawyerData({
        id: lawyerId,
        name: lawyerName,
        hourly_rate: hourlyRate,
        specialty: "" // Se puede obtener si está disponible
      });
    }
  }, [isOpen, lawyerId, lawyerName, hourlyRate, isAppointmentsPage]);

  // Fetch lawyers when a specialty is selected
  useEffect(() => {
    const fetchLawyers = async () => {
      if (!isAppointmentsPage || !selectedSpecialty) {
        setLawyers([]);
        return;
      }
    
      setIsLoadingLawyers(true);
      hasLoadedLawyers.current = false;
      
      try {
        // Use the same search function as the main search page
        const { searchLawyers } = await import('@/pages/api/search-lawyers');
        
        const response = await searchLawyers({
          specialty: selectedSpecialty,
          minRating: 0,
          select: 'id,first_name,last_name,hourly_rate_clp,specialties,rating,review_count,avatar_url,experience_years,verified'
        });
        
        if (response?.lawyers?.length > 0) {
          const mappedLawyers = response.lawyers.map(lawyer => {
            const lawyerData = {
              id: lawyer.id,
              first_name: lawyer.first_name || '',
              last_name: lawyer.last_name || '',
              name: `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim(),
              hourly_rate: lawyer.hourly_rate_clp || 0,
              specialty: Array.isArray(lawyer.specialties) && lawyer.specialties.length > 0 
                ? lawyer.specialties[0] 
                : selectedSpecialty,
              avatar_url: lawyer.avatar_url || '',
              rating: lawyer.rating || 0,
              review_count: lawyer.review_count || 0
            };
            
            return lawyerData;
          });
          
          setLawyers(mappedLawyers);
          hasLoadedLawyers.current = true;
        
          // If there's only one lawyer, select it by default
          if (mappedLawyers.length === 1) {
            setSelectedLawyer(mappedLawyers[0].id);
            setSelectedLawyerData(mappedLawyers[0]);
          } else {
            setSelectedLawyer('');
            setSelectedLawyerData(null);
          }
        } else {
          setLawyers([]);
          setSelectedLawyer('');
          setSelectedLawyerData(null);
          
          toast({
            title: 'No hay abogados',
            description: `No se encontraron abogados disponibles para la especialidad: ${selectedSpecialty}`,
            variant: 'destructive',
          });
        }
        
      } catch (error) {
        console.error('Error fetching lawyers:', error);
        setLawyers([]);
        setSelectedLawyer('');
        setSelectedLawyerData(null);
        
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los abogados. Por favor, inténtalo de nuevo.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingLawyers(false);
      }
    };

    if (selectedSpecialty) {
      fetchLawyers();
    }
  }, [selectedSpecialty, isAppointmentsPage, toast]);

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      const fullName = user.user_metadata?.full_name || 
                      (user.user_metadata?.first_name && user.user_metadata.last_name 
                        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` 
                        : '');
      
      const phone = user.phone || 
                   user.user_metadata?.phone || 
                   '';
      
      const email = user.email || '';

      setFormData(prev => ({
        ...prev,
        name: fullName || prev.name,
        email: email || prev.email,
        phone: phone || prev.phone
      }));
    }
  }, [user]);

  // Helper function to generate time slots
  const generateTimeSlots = useCallback(() => {
    // Debug logging
    console.log('Generating time slots...', { 
      hasAvailability: !!lawyerAvailability, 
      date: formData?.date,
      googleBusy: googleBusySlots 
    });

    if (!lawyerAvailability || !formData.date) return [];

    const selectedDate = parseLocalDateString(formData.date);
    if (!selectedDate) return [];

    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Map to Spanish day names used in ManageAvailability
    const dayMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayMap[dayOfWeek];

    // Availability is stored as { "Lunes": [true, false, ...], ... } mapping to hours 9:00-19:00
    // We need to cast it to any because TypeScript thinks it's a string from the DB schema
    const availabilityObj = lawyerAvailability as any;
    
    // Handle case sensitivity by trying to find the key
    const key = Object.keys(availabilityObj).find(k => k.toLowerCase() === dayName.toLowerCase()) || dayName;
    const dayAvailability = availabilityObj[key];

    // If no availability data for this day or it's not an array (invalid format), return empty
    if (!dayAvailability || !Array.isArray(dayAvailability)) {
      console.log(`No availability array for ${dayName}`);
      return [];
    }

    const slots: { value: string; label: string }[] = [];
    const HOURS_START = 9; // 9:00 AM

    dayAvailability.forEach((isAvailable: boolean, index: number) => {
      if (!isAvailable) return;

      const hour = HOURS_START + index;
      const timeString = `${String(hour).padStart(2, '0')}:00`;
      
      // Calculate end time (assuming 1 hour duration for simplicity based on the grid)
      const endTimeString = `${String(hour + 1).padStart(2, '0')}:00`;

      // Check if slot is already booked
      const isBooked = bookedSlots.has(timeString);

      // Check if slot overlaps with Google Busy Slots
      let isGoogleBusy = false;
      if (googleBusySlots.length > 0 && selectedDate) {
        const slotStartDateTime = new Date(selectedDate);
        slotStartDateTime.setHours(hour, 0, 0, 0);
        const slotEndDateTime = new Date(selectedDate);
        slotEndDateTime.setHours(hour + 1, 0, 0, 0);

        isGoogleBusy = googleBusySlots.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          
          // Check for overlap
          return (
            (slotStartDateTime >= busyStart && slotStartDateTime < busyEnd) || // Slot starts during busy
            (slotEndDateTime > busyStart && slotEndDateTime <= busyEnd) ||   // Slot ends during busy
            (slotStartDateTime <= busyStart && slotEndDateTime >= busyEnd)     // Slot encompasses busy
          );
        });
      }

      if (!isBooked && !isGoogleBusy) {
        slots.push({
          value: timeString,
          label: `${timeString} - ${endTimeString}`
        });
      }
    });

    console.log(`Generated ${slots.length} available slots for ${dayName}`);
    return slots;
  }, [lawyerAvailability, formData.date, bookedSlots, googleBusySlots]);

  // Fetch lawyer availability
  const fetchLawyerAvailability = useCallback(async (lawyerId: string) => {
    if (!lawyerId) {
      return;
    }
    setIsLoadingAvailability(true);
    
    try {
      // Get availability from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('availability')
        .eq('id', lawyerId)
        .single();

      if (error) {
        console.error('Error fetching availability:', error);
        setLawyerAvailability(null);
        return;
      }

      if (!data || !data.availability) {
        setLawyerAvailability(null);
        return;
      }

      // Parse the availability if it's a string
      let availability = data.availability;
      if (typeof availability === 'string') {
        try {
          availability = JSON.parse(availability);
        } catch (parseError) {
          console.error('Error parsing availability JSON:', parseError);
          // If the data is "24/7" or empty, default to standard business hours (9am-6pm, Monday to Friday)
          if (data.availability === '24/7' || !data.availability) {
            console.log('No specific availability set, defaulting to standard business hours (9am-6pm, Monday to Friday)');
            // Create boolean arrays for standard hours (9:00 to 19:00 = 10 slots)
            // true means available. 
            // We need to match the length expected by ManageAvailability (usually 11 slots for 9-19)
            const standardDay = Array(11).fill(false).map((_, i) => i < 9); // 9 hours from 9am = until 6pm
            
            setLawyerAvailability({
              lunes: [...standardDay],
              martes: [...standardDay],
              miercoles: [...standardDay],
              jueves: [...standardDay],
              viernes: [...standardDay],
              sabado: Array(11).fill(false).map((_, i) => i < 5), // Until 2pm (5 hours)
              domingo: Array(11).fill(false)
            });
            return;
          }
        }
      }
      
      setLawyerAvailability(availability);

    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, []);

  // Load availability when lawyer changes
  useEffect(() => {
    if (selectedLawyer) {
      fetchLawyerAvailability(selectedLawyer);
    } else if (lawyerId) {
      fetchLawyerAvailability(lawyerId);
    }
  }, [selectedLawyer, lawyerId, fetchLawyerAvailability]);


  // Fetch available slots when date or lawyer changes
  const fetchAvailableSlots = useCallback(async (dateString: string, lawyerId: string) => {
    if (!dateString || !lawyerId) return;
    
    setIsLoadingSlots(true);
    try {
      // Note: generateTimeSlots now uses the state (lawyerAvailability, selectedDate, etc.)
      // so we don't need to fetch anything here if the state is already set.
      // However, we do need to ensure bookedSlots are up to date.
      
      const { data: bookedData, error: bookedError } = await supabase
        .from('appointments') // Changed from consultations to appointments as that's the main table now
        .select('appointment_time')
        .eq('lawyer_id', lawyerId)
        .eq('appointment_date', dateString)
        .neq('status', 'cancelled'); // Don't count cancelled appointments

      if (bookedError) {
        console.error('Error fetching booked slots:', bookedError);
      }

      const bookedTimes = bookedData
        ?.map((slot) => {
          // Normalize HH:mm:ss to HH:mm
          return slot.appointment_time?.substring(0, 5);
        })
        .filter((time): time is string => Boolean(time)) || [];
        
      setBookedSlots(new Set(bookedTimes));
      
      // The actual slot generation happens in the useEffect that watches bookedSlots
      
    } catch (error) {
      console.error('Error in fetchAvailableSlots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  // Update available slots when dependencies change
  useEffect(() => {
    const slots = generateTimeSlots();
    setAvailableSlots(slots); 
  }, [generateTimeSlots]);

  // Fetch available slots when date or lawyer changes
  useEffect(() => {
    if (formData.date && (selectedLawyer || lawyerId)) {
      fetchAvailableSlots(formData.date, selectedLawyer || lawyerId);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.date, selectedLawyer, lawyerId, fetchAvailableSlots]);

  // Handle date selection from CalendarField
  const handleDateSelect = useCallback((date: string) => {
    setFormData(prev => ({
      ...prev,
      date: date,
      time: "" // Reset time when date changes
    }));
  }, []);

  // CORRECCIÓN: Calcular el costo basado en el abogado seleccionado o el abogado de la tarjeta
  const estimatedCost = useMemo(() => {
    const currentLawyer = selectedLawyerData || (lawyerId ? {
      id: lawyerId,
      name: lawyerName,
      hourly_rate: hourlyRate,
      specialty: ""
    } : null);
    
    if (!currentLawyer) return 0;
    
    const durationInMinutes = parseInt(formData.duration || '60');
    const durationInHours = durationInMinutes / 60;
    return Math.round(durationInHours * currentLawyer.hourly_rate);
  }, [formData.duration, selectedLawyerData, lawyerId, lawyerName, hourlyRate]);
  
  // Calculate final amounts
  const originalAmount = useMemo(() => estimatedCost, [estimatedCost]);
  
  const clientAmount = useMemo(() =>
    Math.round(originalAmount * (1 + platformSettings.client_surcharge_percent)),
    [originalAmount, platformSettings.client_surcharge_percent]
  );

  const clientSurcharge = useMemo(() => Math.max(clientAmount - originalAmount, 0), [clientAmount, originalAmount]);

  const consultationTypes = [
    { value: "consultation", label: "Consulta inicial" },
    { value: "legal-advice", label: "Representación legal" },
    { value: "document-review", label: "Revisión de documentos" },
    { value: "contract-review", label: "Revisión de contratos" },
    { value: "other", label: "Otro" }
  ];

  const validateForm = (data: AppointmentFormData): { valid: boolean; message?: string } => {
    if (!data.name?.trim()) return { valid: false, message: 'El nombre es obligatorio' };
    if (!data.email?.trim()) return { valid: false, message: 'El correo electrónico es obligatorio' };
    if (!/^\S+@\S+\.\S+$/.test(data.email)) return { valid: false, message: 'El correo electrónico no es válido' };
    if (!data.date) return { valid: false, message: 'La fecha es obligatoria' };
    if (!data.time) return { valid: false, message: 'La hora es obligatoria' };
    if (!data.consultationType) return { valid: false, message: 'El tipo de consulta es obligatorio' };
    if (!data.contactMethod) return { valid: false, message: 'El método de contacto es obligatorio' };
    if (data.contactMethod === 'presencial' && !data.address?.trim()) {
      return { valid: false, message: 'La dirección es obligatoria para consultas presenciales' };
    }
    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateForm(formData);
    if (!validation.valid) {
      toast({
        title: "Error de validación",
        description: validation.message || 'Por favor completa todos los campos obligatorios.',
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get the final lawyer ID (either from selection or props)
      const finalLawyerId = selectedLawyer || lawyerId;
      
      if (!finalLawyerId) {
        throw new Error('No se ha seleccionado un abogado');
      }

      // Create appointment data
      const appointmentData = {
        name: formData.name || 'Cliente',
        email: formData.email || '',
        phone: formData.phone || '',
        user_id: user?.id || '',
        lawyer_id: finalLawyerId,
        status: 'pending_payment',
        appointment_date: formData.date,
        appointment_time: formData.time,
        duration: parseInt(formData.duration) || 60,
        consultation_type: formData.consultationType || 'consultation',
        contact_method: formData.contactMethod,
        price: clientAmount,
        notes: formData.description || '',
        amount: clientAmount,
        currency: 'CLP',
        meeting_link: null,
        address: formData.contactMethod === 'presencial' ? formData.address : null
      };

      // Insert the appointment into the database
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) {
        console.error('Database error:', appointmentError);
        throw new Error(`Error al crear la cita: ${appointmentError.message}`);
      }
      
      // Create payment with MercadoPago
      try {
        
        const paymentParams = {
          amount: clientAmount,
          originalAmount,
          userId: user?.id || '',
          lawyerId: finalLawyerId,
          appointmentId: appointment.id,
          description: `Consulta legal con ${selectedLawyerData?.name || lawyerName}`,
          // Use fallback base URL if window.location.origin is empty
          successUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/success?appointmentId=${appointment.id}`,
          failureUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/failure?appointmentId=${appointment.id}`,
          pendingUrl: `${window.location.origin || 'https://uplegal.netlify.app'}/payment/pending?appointmentId=${appointment.id}`,
          userEmail: user?.email || formData.email,
          userName: user?.user_metadata?.full_name || formData.name
        };

        // Validate URLs before sending
        if (!paymentParams.successUrl || !paymentParams.failureUrl || !paymentParams.pendingUrl) {
          throw new Error('Error al generar las URLs de retorno del pago');
        }
        
        // USAR NETLIFY FUNCTIONS - ENDPOINT CORRECTO
        const API_BASE_URL = 'https://uplegal.netlify.app';
        const FUNCTION_URL = `${API_BASE_URL}/.netlify/functions/create-payment`;
        
        // Test the function with OPTIONS request
        const testResponse = await fetch(FUNCTION_URL, {
          method: 'OPTIONS'
        });
        
        if (!testResponse.ok) {
          throw new Error(`Function not available: ${testResponse.status}`);
        }
        
        // Create the payment
        const response = await fetch(FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentParams)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Payment API error response:', errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const paymentResult = await response.json();
        
        // Redirect to payment URL
        if (paymentResult.payment_link) {
          
          // Save appointment data to localStorage for the success page
          const pendingAppointmentData = {
            clientEmail: formData.email,
            clientName: formData.name,
            lawyerName: selectedLawyerData?.name || lawyerName,
            lawyerId: finalLawyerId, // Important for fetching lawyer email later
            appointmentDate: formData.date,
            appointmentTime: formData.time,
            serviceType: formData.consultationType,
            duration: formData.duration,
            description: formData.description,
            contactMethod: formData.contactMethod
          };
          
          localStorage.setItem('pendingAppointment', JSON.stringify(pendingAppointmentData));
          
          // Show redirecting overlay
          setIsRedirecting(true);
          
          // Small delay to allow React to render the overlay before redirecting
          setTimeout(() => {
            window.location.href = paymentResult.payment_link;
          }, 300);
        } else {
          throw new Error('No se pudo obtener el enlace de pago');
        }
      } catch (paymentError) {
        console.error('Error creating payment:', paymentError);
        throw new Error(`Error al crear el pago: ${paymentError.message}`);
      }
      
    } catch (error) {
      let errorMessage = 'Error al procesar la cita. Por favor, inténtalo de nuevo.';
      
      if (error instanceof Error) {
        console.error('Error al procesar la cita:', error);
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsRedirecting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Handle select input changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle lawyer selection
  const handleLawyerSelect = async (lawyerId: string) => {
    setSelectedLawyer(lawyerId);
    const lawyer = lawyers.find(l => l.id === lawyerId) || null;
    setSelectedLawyerData(lawyer);
    
    if (lawyer) {
      // Update form data with the selected lawyer's default duration if not set
      if (!formData.duration) {
        setFormData(prev => ({
          ...prev,
          duration: '60'
        }));
      }
      
      // If we have a selected date, fetch availability
      if (formData.date) {
        fetchAvailableSlots(formData.date, lawyerId);
      }
    }
  };

  // CORRECCIÓN: Resetear el estado cuando se cierra el modal
  const handleClose = () => {
    if (!isAppointmentsPage) {
      // Resetear solo si no estamos en la página de appointments
      setSelectedLawyer(lawyerId || '');
      setSelectedLawyerData(lawyerId ? {
        id: lawyerId,
        name: lawyerName,
        hourly_rate: hourlyRate,
        specialty: ""
      } : null);
    }
    onClose();
  };

  return (
    <>
      {/* Redirecting Overlay - Fixed position to appear on top of everything */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">Redirigiendo al Checkout</h3>
              <p className="text-sm text-gray-600">Por favor espera un momento...</p>
            </div>
          </div>
        </div>
      )}
      
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          className="sm:max-w-[425px] md:max-w-2xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 rounded-none sm:rounded-lg"

        >

        <DialogHeader className="sticky top-0 bg-background z-10 py-4 px-6 border-b border-border/50">
          <Button
            type="button"
            variant="ghost"
            className="absolute right-4 top-4 px-2 h-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
          <DialogTitle className="text-left">
            Solicita asesoría con {selectedLawyerData?.name || lawyerName}
          </DialogTitle>
          <DialogDescription className="text-left">
            Completa el formulario para agendar tu asesoría. Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <ValidatedInput
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                showCheckmark={!!formData.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <ValidatedInput
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                showCheckmark={!!formData.phone}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico *</Label>
            <ValidatedInput
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              showCheckmark={!!formData.email}
              required
            />
          </div>
          
          {isAppointmentsPage && (
            <>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="specialty">Especialidades *</Label>
                <div className="relative">
                  <Select 
                    value={selectedSpecialty} 
                    onValueChange={(value) => {
                      setSelectedSpecialty(value);
                      setSelectedLawyer('');
                      setSelectedLawyerData(null);
                    }}
                    required
                  >
                    <SelectTrigger 
                      ref={specialtySelectRef}
                      className={cn(
                        selectedSpecialty && "border-green-500 ring-0.5 ring-green-500"
                      )}
                    >
                      <SelectValue placeholder="Selecciona una especialidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="lawyer">Abogado *</Label>
                <div className="relative">
                  <Select 
                    value={selectedLawyer} 
                    onValueChange={handleLawyerSelect}
                    disabled={!selectedSpecialty || isLoadingLawyers}
                    required
                  >
                    <SelectTrigger className={cn(
                      "w-full",
                      selectedLawyer && "border-green-500 ring-0.5 ring-green-500"
                    )}>
                      <SelectValue 
                        placeholder={
                          !selectedSpecialty 
                            ? 'Selecciona una especialidad primero' 
                            : isLoadingLawyers 
                              ? 'Cargando abogados...'
                              : lawyers.length === 0 
                                ? 'No hay abogados disponibles para esta especialidad'
                                : 'Selecciona un abogado'
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {lawyers.length > 0 ? (
                        lawyers.map((lawyer) => (
                          <SelectItem key={lawyer.id} value={lawyer.id} className="py-2">
                            <div className="flex items-center gap-3 w-full">
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
                                {lawyer.avatar_url ? (
                                  <img 
                                    src={lawyer.avatar_url} 
                                    alt={lawyer.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/default-avatar.png';
                                    }}
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gray-300 flex items-center justify-center text-gray-500">
                                    {lawyer.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="w-full flex items-center justify-between">
                                <div className="flex-1 min-w-0 max-w-lg">
                                  <p className="text-sm font-medium text-gray-900">
                                    {lawyer.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate text-left">
                                    {lawyer.specialty}
                                  </p>
                                </div>
                                <div className="text-sm font-medium text-gray-900 whitespace-nowrap ml-4">
                                  {formatCurrency(lawyer.hourly_rate)}/hora
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          No se encontraron abogados para esta especialidad
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Método de contacto *</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="radio"
                    id="videollamada"
                    name="contactMethod"
                    value="videollamada"
                    checked={formData.contactMethod === 'videollamada'}
                    onChange={() => setFormData({ ...formData, contactMethod: 'videollamada' })}
                    className="hidden peer"
                  />
                  <label 
                    htmlFor="videollamada"
                    className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.contactMethod === 'videollamada' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Video className="h-6 w-6 mb-2 text-gray-700" />
                    <span className="text-sm font-medium">Videollamada</span>
                  </label>
                </div>
                <div>
                  <input
                    type="radio"
                    id="llamada"
                    name="contactMethod"
                    value="llamada"
                    checked={formData.contactMethod === 'llamada'}
                    onChange={() => setFormData({ ...formData, contactMethod: 'llamada' })}
                    className="hidden peer"
                  />
                  <label 
                    htmlFor="llamada"
                    className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.contactMethod === 'llamada' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Phone className="h-6 w-6 mb-2 text-gray-700" />
                    <span className="text-sm font-medium">Llamada</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CalendarField 
              formData={formData} 
              onDateSelect={handleDateSelect}
              lawyerAvailability={lawyerAvailability || {}}
              selectedLawyerId={selectedLawyer || lawyerId}
            />
            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <div className="relative">
                <Select
                  value={formData.time}
                  onValueChange={(value) => handleSelectChange("time", value)}
                  disabled={availableSlots.length === 0 || isLoadingSlots}
                >
                  <SelectTrigger className={cn(
                    "w-full",
                    formData.time && "border-green-500 ring-0.5 ring-green-500",
                    (availableSlots.length === 0 || isLoadingSlots) && "opacity-70"
                  )}>
                    <SelectValue placeholder={
                      isLoadingSlots ? "Cargando horarios..." : 
                      availableSlots.length === 0 ? "No hay horarios disponibles" : 
                      "Selecciona una hora"
                    } />
                  </SelectTrigger>
                    <SelectContent>
                      {isLoadingSlots ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Cargando horarios disponibles...
                          </div>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <p>No hay horarios disponibles para este día.</p>
                          <p className="text-xs mt-1">Por favor, selecciona otra fecha.</p>
                        </div>
                      ) : (
                        availableSlots.map((slot) => {
                          const [hours, minutes] = slot.value.split(':').map(Number);
                          const selectedDateObj = parseLocalDateString(formData.date);
                          const isToday = selectedDateObj
                            ? selectedDateObj.toDateString() === new Date().toDateString()
                            : false;
                          
                          let isDisabled = false;
                          if (isToday) {
                            const now = new Date();
                            isDisabled = hours < now.getHours() || (hours === now.getHours() && minutes < now.getMinutes());
                          }
                          
                          return (
                            <SelectItem 
                              key={slot.value} 
                              value={slot.value}
                              disabled={isDisabled}
                              className={cn(
                                'px-4 py-2',
                                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                              )}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{slot.label}</span>
                          </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  {formData.time && (
                    <Check 
                      className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" 
                      aria-hidden="true"
                      strokeWidth={3}
                    />
                  )}
                </div>
              </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duración *</Label>
              <div className="relative">
                <Select value={formData.duration} onValueChange={(value) => handleSelectChange("duration", value)}>
                  <SelectTrigger className={cn(
                    formData.duration && "border-green-500 ring-0.5 ring-green-500"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
                {formData.duration && (
                  <Check 
                    className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" 
                    aria-hidden="true"
                    strokeWidth={3}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultationType">Tipo de consulta *</Label>
              <div className="relative">
                <Select
                  value={formData.consultationType}
                  onValueChange={(value) => handleSelectChange("consultationType", value)}
                >
                  <SelectTrigger className={cn(
                    formData.consultationType && "border-green-500 ring-0.5 ring-green-500"
                  )}>
                    <SelectValue placeholder="Selecciona un tipo de consulta" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.consultationType && (
                  <Check 
                    className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" 
                    aria-hidden="true"
                    strokeWidth={3}
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del caso</Label>
            <div className="relative">
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe brevemente el motivo de tu consulta"
                className={cn(
                  "min-h-[100px] pr-10",
                  formData.description && "border-green-500 ring-0.5 ring-green-500"
                )}
              />
              {formData.description && (
                <Check 
                  className="absolute right-3 top-3 h-4 w-4 text-green-500" 
                  aria-hidden="true"
                  strokeWidth={3}
                />
              )}
            </div>
          </div>
          
          {/* Cost Estimate */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            {/* CORRECCIÓN: Mostrar siempre el precio del abogado seleccionado o de la tarjeta */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Tarifa por hora</span>
                <span className="font-medium">
                  {formatCurrency(selectedLawyerData?.hourly_rate || hourlyRate)}/hora
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Duración seleccionada</span>
                <span className="text-sm font-medium">
                  {formData.duration || "60"} minutos
                </span>
              </div>

              <div className="border-t border-gray-200 my-2"></div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Subtotal</span>
                <span className="font-medium">{formatCurrency(estimatedCost)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <span className="text-gray-600">Tarifa por servicio</span>
                  <span className="ml-1 text-xs text-gray-500">*</span>
                </div>
                <span className="text-gray-600">
                  +{formatCurrency(clientSurcharge)}
                </span>
              </div>

              <div className="border-t border-gray-200 my-2"></div>
              
              <div className="flex justify-between items-center font-semibold text-lg">
                <span className="text-base font-bold">Total a pagar</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(clientAmount)}</span>
              </div>
            </div>

              <p className="text-xs text-gray-500 mt-2">
                * Incluye 10% de recargo por servicio app.
              </p>
            
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-70"
                disabled={isProcessing || !formData.date || !formData.time}
              >
                {isProcessing 
                  ? "Redirigendo al Checkout..." 
                  : (selectedLawyer || lawyerId)
                    ? `Pagar ${formatCurrency(clientAmount)}`
                    : 'Selecciona un abogado'}
              </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}