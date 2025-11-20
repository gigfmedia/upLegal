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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, startOfDay, isSameDay, addDays, isBefore, isPast, isToday, isValid } from 'date-fns';
import { es } from "date-fns/locale";
import CalendarField  from '@/components/availability/CalendarField';

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

// Format currency helper function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
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
  "Derecho de Seguros",
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

export function ScheduleModal({ isOpen, onClose, lawyerName, hourlyRate, lawyerId }: ScheduleModalProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const hasLoadedLawyers = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedLawyer, setSelectedLawyer] = useState<string>(lawyerId || '');
  const [selectedLawyerData, setSelectedLawyerData] = useState<Lawyer | null>(null);
  const [isLoadingLawyers, setIsLoadingLawyers] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>(SPECIALTIES);
  const [lawyerAvailability, setLawyerAvailability] = useState<Record<string, any> | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isLoadingBookedSlots, setIsLoadingBookedSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const isAppointmentsPage = window.location.pathname === '/dashboard/appointments';
  const { toast } = useToast();
  
  // Refs for focus management
  const specialtySelectRef = useRef<HTMLButtonElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

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
    
    return {
      name: fullName,
      email: email,
      phone: phone,
      date: format(new Date(), 'yyyy-MM-dd'), // Set today's date as default
      time: "",
      duration: "60",
      consultationType: "consultation",
      contactMethod: "videollamada", // Default to videocall
      description: "",
      address: "" // Add address field for presential meetings
    };
  });

  // Fetch lawyers when a specialty is selected
  useEffect(() => {
    const fetchLawyers = async () => {
      if (!isAppointmentsPage || !selectedSpecialty) {
        console.log('No specialty selected or not on appointments page');
        setLawyers([]);
        return;
      }
      
      console.log('Fetching lawyers for specialty:', selectedSpecialty);
      setIsLoadingLawyers(true);
      hasLoadedLawyers.current = false;
      
      try {
        // Use the same search function as the main search page
        const { searchLawyers } = await import('@/lib/api/lawyerSearch');
        
        // Log the search parameters
        console.log('Searching with params:', {
          specialty: selectedSpecialty,
          minRating: 0,
          select: 'id,first_name,last_name,hourly_rate_clp,specialties,rating,review_count,avatar_url,experience_years,verified'
        });
        
        const response = await searchLawyers({
          specialty: selectedSpecialty,
          minRating: 0, // Show all lawyers, not just highly rated ones
          // Explicitly select the columns we need
          select: 'id,first_name,last_name,hourly_rate_clp,specialties,rating,review_count,avatar_url,experience_years,verified'
        });
        
        console.log('Fetched lawyers response:', {
          specialty: selectedSpecialty,
          total: response?.total || 0,
          lawyers: response?.lawyers?.length || 0
        });
        
        if (response?.lawyers?.length > 0) {
          // Log the first lawyer's data for debugging
          console.log('First lawyer data:', response.lawyers[0]);
          
          // Map the lawyers to the expected format
          const mappedLawyers = response.lawyers.map(lawyer => {
            const lawyerData = {
              id: lawyer.id,
              first_name: lawyer.first_name || '',
              last_name: lawyer.last_name || '',
              name: `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim(),
              hourly_rate: lawyer.hourly_rate_clp || 0,
              // Use the first specialty from the specialties array if available
              specialty: Array.isArray(lawyer.specialties) && lawyer.specialties.length > 0 
                ? lawyer.specialties[0] 
                : selectedSpecialty,
              avatar_url: lawyer.avatar_url || '',
              rating: lawyer.rating || 0,
              review_count: lawyer.review_count || 0
            };
            
            console.log('Mapped lawyer:', lawyerData);
            return lawyerData;
          });
          
          console.log('All mapped lawyers:', mappedLawyers);
          setLawyers(mappedLawyers);
          hasLoadedLawyers.current = true;
        
          // If there's only one lawyer, select it by default
          if (mappedLawyers.length === 1) {
            console.log('Auto-selecting the only available lawyer:', mappedLawyers[0]);
            setSelectedLawyer(mappedLawyers[0].id);
            setSelectedLawyerData(mappedLawyers[0]);
            
            // Update form data with the selected lawyer's hourly rate
            setFormData(prev => ({
              ...prev,
              hourlyRate: mappedLawyers[0].hourly_rate.toString()
            }));
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
        
        // Show error toast for all errors
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

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setSelectedDate(date);
      setFormData(prev => ({
        ...prev,
        date: formattedDate
      }));
      
      // If we have a selected lawyer, fetch availability
      if (selectedLawyer) {
        fetchAvailableSlots(date, selectedLawyer);
      }
    }
  };

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

  // Fetch available time slots for the selected date and lawyer
  const fetchAvailableSlots = useCallback(async (date: Date, lawyerId: string) => {
    if (!lawyerId || !date || !isValid(date)) {
      console.log('Invalid date or lawyer ID');
      setAvailableSlots([]);
      return;
    }

    try {
      setIsLoadingSlots(true);
      setAvailableSlots([]);
      
      // Format the date to YYYY-MM-DD
      const formattedDate = format(date, 'yyyy-MM-dd');
      const dayOfWeek = format(date, 'EEEE', { locale: es }).toLowerCase();
      
      console.log('Fetching slots for:', { formattedDate, dayOfWeek, lawyerId });

      // Get lawyer's availability for the selected day
      const { data: availability, error: availabilityError } = await supabase
        .from('lawyer_availability')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (availabilityError || !availability) {
        console.log('No availability in lawyer_availability, checking profiles table');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('availability')
          .eq('id', lawyerId)
          .single();

        if (profileError || !profileData?.availability) {
          console.error('No availability data found');
          toast({
            title: 'Horario no disponible',
            description: 'El abogado no tiene horario disponible para este día',
            variant: 'destructive',
          });
          return;
        }
        
        const availabilityData = profileData.availability[dayOfWeek];
        if (!availabilityData) {
          console.log('No availability for day:', dayOfWeek);
          setAvailableSlots([]);
          return;
        }
        
        // Get booked slots
        const { data: bookedSlots, error: bookedError } = await supabase
          .from('consultations')
          .select('start_time')
          .eq('lawyer_id', lawyerId)
          .eq('appointment_date', formattedDate);

        if (bookedError) throw bookedError;

        const slots = generateTimeSlots(
          availabilityData.start_time,
          availabilityData.end_time,
          availabilityData.slot_duration || 60,
          bookedSlots?.map(s => s.start_time) || []
        );
        
        setAvailableSlots(slots);
      } else {
        // Get booked slots
        const { data: bookedSlots, error: bookedError } = await supabase
          .from('consultations')
          .select('start_time')
          .eq('lawyer_id', lawyerId)
          .eq('appointment_date', formattedDate);

        if (bookedError) throw bookedError;

        const slots = generateTimeSlots(
          availability.start_time,
          availability.end_time,
          availability.slot_duration || 60,
          bookedSlots?.map(s => s.start_time) || []
        );
        
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los horarios disponibles',
        variant: 'destructive',
      });
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [toast]);

  // Helper function to generate time slots
  const generateTimeSlots = useCallback((startTime: string, endTime: string, duration: number, bookedSlots: string[] = []) => {
    console.log('Generating slots from', startTime, 'to', endTime, 'with duration', duration, 'booked slots:', bookedSlots);
    const slots: Array<{value: string, label: string}> = [];
    
    try {
      // Parse start and end times
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      // Validate inputs
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        console.error('Invalid time format');
        return [];
      }

      let currentHour = startHour;
      let currentMinute = startMinute;
      
      // Generate slots until we reach or pass the end time
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        // Calculate end time of this slot
        let slotEndHour = currentHour;
        let slotEndMinute = currentMinute + duration;
        
        // Handle hour rollover
        while (slotEndMinute >= 60) {
          slotEndHour += 1;
          slotEndMinute -= 60;
        }
        
        const slotEnd = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMinute).padStart(2, '0')}`;
        
        // Check if this slot is booked
        const isBooked = bookedSlots.some(booked => {
          if (!booked) return false;
          const [bookedHour, bookedMinute] = booked.split(':').map(Number);
          return currentHour === bookedHour && currentMinute === bookedMinute;
        });
        
        // Only add the slot if it doesn't go past the end time and is not booked
        if ((slotEndHour < endHour || (slotEndHour === endHour && slotEndMinute <= endMinute)) && !isBooked) {
          slots.push({
            value: slotStart,
            label: `${slotStart} - ${slotEnd}`
          });
        }
        
        // Move to the next slot
        currentMinute += duration;
        while (currentMinute >= 60) {
          currentHour += 1;
          currentMinute -= 60;
        }
      }
      
      console.log('Generated slots:', slots);
      return slots;
    } catch (error) {
      console.error('Error generating time slots:', error);
      return [];
    }
  }, []);

const fetchLawyerAvailability = useCallback(async (lawyerId: string) => {
  if (!lawyerId) {
    console.log('No lawyer ID provided');
    return;
  }

  console.log('Fetching availability for lawyer ID:', lawyerId);
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
      console.log('No availability data found');
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
        setLawyerAvailability(null);
        return;
      }
    }

    // Transform the availability data to match CalendarField's expected format
    const transformedAvailability: Record<string, boolean[]> = {};
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    // Initialize all days as not available by default
    days.forEach(day => {
      transformedAvailability[day] = Array(24).fill(false);
    });

    // Update with actual availability if it exists
    if (availability) {
      Object.entries(availability).forEach(([day, hours]) => {
        if (Array.isArray(hours)) {
          transformedAvailability[day] = hours;
        }
      });
    }

    console.log('Transformed availability:', transformedAvailability);
    setLawyerAvailability(transformedAvailability);

  } catch (error) {
    console.error('Unexpected error:', error);
    toast({
      title: "Error",
      description: "Error inesperado al cargar la disponibilidad",
      variant: "destructive"
    });
  } finally {
    setIsLoadingAvailability(false);
  }
}, [toast]);

// This is where your existing useEffect starts
useEffect(() => {
  if (selectedLawyer) {
    fetchLawyerAvailability(selectedLawyer);
  } else if (lawyerId) {
    fetchLawyerAvailability(lawyerId);
  }
}, [selectedLawyer, lawyerId, fetchLawyerAvailability]);

  // Load availability when lawyer changes
  useEffect(() => {
    if (selectedLawyer) {
      fetchLawyerAvailability(selectedLawyer);
    } else if (lawyerId) {
      fetchLawyerAvailability(lawyerId);
    }
  }, [selectedLawyer, lawyerId, fetchLawyerAvailability]);

  // Fetch available slots when date or lawyer changes
  useEffect(() => {
    if (formData.date && (selectedLawyer || lawyerId)) {
      const date = new Date(formData.date);
      if (!isNaN(date.getTime())) { // Check if date is valid
        fetchAvailableSlots(date, selectedLawyer || lawyerId);
      }
    } else {
      setAvailableSlots([]);
    }
  }, [formData.date, selectedLawyer, lawyerId]);

  // Function to check if a date is disabled
  const isDateDisabled = useCallback((date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (date < today) return true;
    
    // If no availability data, enable all future dates by default
    if (!lawyerAvailability) return false;
    
    const dayOfWeek = date.getDay();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayKey = days[dayOfWeek];
    const dayAvailability = lawyerAvailability[dayKey];
    
    // If day has no availability array or all values are false, disable it
    if (!dayAvailability || !Array.isArray(dayAvailability)) {
      return true;
    }
    
    // Check if there's at least one available hour
    const hasAvailableHours = dayAvailability.some(hour => hour === true);
    return !hasAvailableHours;
  }, [lawyerAvailability]);

  // Get available time slots based on selected date and lawyer's availability
  const getAvailableTimeSlots = useCallback(() => {
    console.log('Getting available time slots...');
    console.log('Selected date:', formData.date);
    console.log('Lawyer availability data:', lawyerAvailability);
    
    if (!formData.date || !lawyerAvailability) {
      console.log('No date selected or no availability data');
      return [];
    }
    
    const dayOfWeek = new Date(formData.date).getDay();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayKey = days[dayOfWeek];
    const dayAvailability = lawyerAvailability[dayKey];
    
    console.log(`Processing ${dayKey} availability:`, dayAvailability);
    
    if (!dayAvailability || !Array.isArray(dayAvailability)) {
      console.log(`No availability data for ${dayKey}`);
      return [];
    }

    // Generate time slots based on the boolean array
    const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00–18:00
    const slots = [];
    
    for (let i = 0; i < dayAvailability.length && i < HOURS.length; i++) {
      if (dayAvailability[i]) {
        const hour = HOURS[i];
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        slots.push(timeString);
      }
    }

    console.log(`Available slots for ${dayKey}:`, slots);
    return slots;
  }, [formData.date, lawyerAvailability]);

  // Use the generated time slots
  const timeSlots = useMemo(() => {
    return getAvailableTimeSlots();
  }, [getAvailableTimeSlots]);

  // Format number with dots as thousand separators
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Calculate estimated cost based on selected lawyer's rate
  const estimatedCost = useMemo(() => {
    if (!selectedLawyerData) return 0;
    const durationInMinutes = parseInt(formData.duration || '60');
    const durationInHours = durationInMinutes / 60;
    return Math.round(durationInHours * selectedLawyerData.hourly_rate);
  }, [formData.duration, selectedLawyerData]);
  
  // Calculate final amounts
  const originalAmount = useMemo(() => estimatedCost, [estimatedCost]);
  
  const clientAmount = useMemo(() => 
    Math.round(originalAmount * 1.1), // Amount with 10% surcharge
    [originalAmount]
  );

  // Fetch specialties on component mount
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const { data, error } = await supabase
          .from('specialties')
          .select('*')
          .order('name');
          
        if (error) throw error;
        setSpecialties(data || []);
      } catch (error) {
        console.error('Error fetching specialties:', error);
        // Silently handle the error without showing a toast
        setSpecialties([]);
      }
    };

    if (isAppointmentsPage) {
      fetchSpecialties();
    }
  }, [isAppointmentsPage]);
  
  // Focus management when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (isAppointmentsPage && specialtySelectRef.current) {
          // Focus on specialty select if on appointments page
          specialtySelectRef.current.focus();
        } else if (timeInputRef.current) {
          // Otherwise focus on time input
          timeInputRef.current.focus();
        }
      }, 100); // Small delay to ensure modal is fully rendered
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, isAppointmentsPage]);

  // Configuración de fechas - usar fecha local sin hora
  const getLocalDate = (date = new Date()) => {
    const localDate = new Date(date);
    return new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
  };
  
  const today = getLocalDate();
  
  // Fecha mínima es hoy (sin importar la hora actual)
  const minDate = new Date(today);
  
  // Si hoy es domingo, comenzar desde mañana (lunes)
  if (minDate.getDay() === 0) {
    minDate.setDate(minDate.getDate() + 1);
  }
  
  // Formatear como YYYY-MM-DD para el input de fecha
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const minDateString = formatDateForInput(minDate);

  // Fecha máxima: 90 días a partir de hoy
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 90);
  
  // Si la fecha máxima cae en domingo, retroceder al sábado
  if (maxDate.getDay() === 0) {
    maxDate.setDate(maxDate.getDate() - 1);
  }
  
  const maxDateString = formatDateForInput(maxDate);

  // Function to get the next valid day (not Sunday)
  const getNextValidDay = useCallback((date: Date): string => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1); // Sumar 1 día
    
    // Si es domingo, sumar otro día para llegar al lunes
    if (nextDay.getDay() === 0) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return formatDateForInput(nextDay);
  }, []);

  // Check if a date is a Sunday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const isSunday = (dateString: string): boolean => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCDay() === 0; // 0 is Sunday
  };

  // Helper function to get day name from date
  const getDayName = (date: Date) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  // Prevent selecting Sundays in the date picker
  useEffect(() => {
    const dateInput = document.getElementById('date') as HTMLInputElement;
    if (!dateInput) return;

    const handleDateInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (isSunday(target.value)) {
        e.preventDefault();
        const nextValidDate = getNextValidDay(new Date(target.value));
        
        // Update the input value directly to prevent selection
        target.value = nextValidDate;
        
        setFormData(prev => ({
          ...prev,
          date: nextValidDate
        }));
        
        toast({
          title: "Domingo no disponible",
          description: `Hemos ajustado la fecha al lunes ${nextValidDate}.`,
          variant: "destructive"
        });
      }
    };

    dateInput.addEventListener('input', handleDateInput);
    dateInput.addEventListener('change', handleDateInput);
    
    return () => {
      dateInput.removeEventListener('input', handleDateInput);
      dateInput.removeEventListener('change', handleDateInput);
    };
  }, [getNextValidDay, isSunday, setFormData, toast]);

  // Generate a Google Meet link with the appointment details
  const generateMeetingLink = useCallback(() => {
    if (formData.date && formData.time) {
      const [hours, minutes] = formData.time.split(':').map(Number);
      const meetingDate = new Date(formData.date);
      meetingDate.setHours(hours, minutes, 0, 0);
      
      return generateGoogleMeetLink(
        `Consulta con ${lawyerName}`,
        meetingDate,
        parseInt(formData.duration || '60')
      );
    }
    return generateGoogleMeetLink(`Consulta con ${lawyerName}`);
  }, [formData.date, formData.time, formData.duration, lawyerName]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const consultationTypes = [
    { value: "consultation", label: "Consulta inicial" },
    { value: "legal-advice", label: "Representación legal" },
    { value: "document-review", label: "Revisión de documentos" },
    { value: "contract-review", label: "Revisión de contratos" },
    { value: "other", label: "Otro" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.date || !formData.time || 
        !formData.consultationType || !formData.contactMethod) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate base URL
    const baseUrl = window.location.origin;
    if (!baseUrl || baseUrl === 'null') {
      toast({
        title: "Error",
        description: "No se pudo determinar la URL base. Por favor, recarga la página e intenta de nuevo.",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure we're using HTTPS in production
    const isProduction = import.meta.env.PROD;
    const protocol = isProduction ? 'https:' : window.location.protocol;
    const formattedBaseUrl = isProduction 
      ? baseUrl.replace(/^http:/, 'https:') 
      : baseUrl;

    setIsProcessing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const serviceType = consultationTypes.find(t => t.value === formData.consultationType)?.label || formData.consultationType;
      const description = `Consulta con ${lawyerName}`;
      
      // Get the current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Error getting session:', sessionError);
        throw new Error('No se pudo verificar tu sesión. Por favor, inicia sesión nuevamente.');
      }

      // Ensure we have a valid base URL
      const baseUrl = window.location.origin;
      if (!baseUrl || baseUrl === 'null') {
        throw new Error('No se pudo determinar la URL base');
      }

      // Prepare back URLs with proper formatting
      const backUrls = {
        success: `${baseUrl}/payment/success`,
        failure: `${baseUrl}/payment/failure`,
        pending: `${baseUrl}/payment/pending`
      };

      // Calculate fees: 20% platform fee, 10% client surcharge
      const durationInHours = parseInt(formData.duration || '0') / 60;
      const estimatedCost = selectedLawyerData 
        ? durationInHours * selectedLawyerData.hourly_rate 
        : 0;
      const MIN_AMOUNT_CLP = 1000;
      const originalAmount = Math.max(Math.round(estimatedCost), MIN_AMOUNT_CLP);
      const platformFee = Math.round(originalAmount * 0.2); // 20% of original amount
      const clientSurcharge = Math.round(originalAmount * 0.1); // 10% surcharge to client
      const clientAmount = Math.round(originalAmount * 1.1); // Amount client pays (original + 10%)
      const lawyerAmount = originalAmount - platformFee; // Amount lawyer receives (original - 20%)

      // If lawyerId is not available, use a default value or handle it appropriately
      // For now, we'll use the current user's ID as a fallback, but you might want to handle this differently
      const targetLawyerId = lawyerId || user?.id || '';
      
      if (!targetLawyerId) {
        throw new Error('No se pudo identificar al abogado para esta cita');
      }

      // Get lawyer's user_id from profile if available
      let lawyerUserId = targetLawyerId;
      
      // Only try to fetch profile if we have a lawyerId
      if (lawyerId) {
        const { data: lawyerProfile, error: lawyerProfileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', lawyerId)
          .maybeSingle();

        if (!lawyerProfileError && lawyerProfile) {
          lawyerUserId = lawyerProfile.user_id;
        }
      }

      // Create payment record with fees
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user?.id || '',
          lawyer_id: lawyerUserId,
          amount: clientAmount, // Amount with surcharge
          platform_fee: platformFee,
          lawyer_amount: lawyerAmount,
          currency: 'CLP',
          status: 'pending',
          metadata: {
            type: 'appointment',
            original_amount: originalAmount,
            client_surcharge: clientSurcharge,
            appointment_info: {
              date: formatDate(formData.date),
              time: formData.time || '',
              duration: formData.duration || 60,
              description: formData.description || '',
              contact_method: formData.contactMethod || 'videollamada'
            }
          }
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Continue anyway, but log the error
      }

      // Prepare the request payload
      const payload = {
        items: [{
          id: `consulta-${Date.now()}`,
          title: `Consulta con ${lawyerName}`,
          description: formData.consultationType || 'Consulta legal',
          quantity: 1,
          unit_price: clientAmount, // Client pays amount with surcharge
          currency_id: 'CLP',
          category_id: 'services'
        }],
        payer: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: {
            number: formData.phone ? formData.phone.replace(/\D/g, '') : '000000000',
            area_code: '56' // Default Chile area code
          }
        },
        back_urls: backUrls,
        auto_return: 'approved',
        binary_mode: true,
        statement_descriptor: 'UPLEGAL',
        metadata: {
          client_id: user?.id || 'unknown',
          lawyer_id: lawyerId,
          service_type: formData.consultationType || 'general',
          contact_method: formData.contactMethod || 'videollamada',
          created_at: new Date().toISOString(),
          payment_id: payment?.id || null,
          original_amount: originalAmount,
          platform_fee: platformFee,
          client_surcharge: clientSurcharge,
          lawyer_amount: lawyerAmount,
          appointment_info: {
            date: formatDate(formData.date),
            time: formData.time || '',
            duration: formData.duration || 60, // Default to 60 minutes
            description: formData.description || '',
            contact_method: formData.contactMethod || 'videollamada'
          },
          amount: clientAmount
        },
        external_reference: payment?.id || `appointment-${Date.now()}`
      };

      // Log the request payload (without sensitive data)
      const { payer, ...payloadWithoutPII } = payload;
      console.debug('Sending request to MercadoPago:', {
        ...payloadWithoutPII,
        payer: {
          ...payer,
          email: '[REDACTED]',
          phone: { ...payer.phone, number: '***' + (payer.phone?.number?.slice(-3) || '') }
        }
      });
      
      // Make the API request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mercado-pago-preference`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

      // Parse the response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Error procesando la respuesta del servidor');
      }
      
      // Log the response
      console.debug('Response from Supabase Function:', {
        status: response.status,
        statusText: response.statusText,
        data: {
          ...responseData,
          init_point: responseData.init_point ? '[REDACTED]' : undefined,
          sandbox_init_point: responseData.sandbox_init_point ? '[REDACTED]' : undefined
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorDetails = responseData?.error?.details || responseData?.details;
        const errorMessage = responseData?.error?.message || 
                           responseData?.message || 
                           `Error del servidor: ${response.status} ${response.statusText}`;
                           
        console.error('Error details:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData?.error,
          details: errorDetails
        });
        
        throw new Error(errorMessage);
      }

      // Update payment record with MercadoPago preference ID if payment was created
      if (payment?.id && responseData.id) {
        await supabase
          .from('payments')
          .update({
            metadata: {
              ...payment.metadata,
              mercadopago_preference_id: responseData.id
            }
          })
          .eq('id', payment.id);
      }

      // Create appointment record in the database
      const appointmentData = {
        user_id: user?.id || '',
        lawyer_id: lawyerId || user?.id || '',
        payment_id: payment?.id || responseData.id || '',
        status: 'scheduled',
        appointment_date: formData.date,
        appointment_time: formData.time || '',
        duration: parseInt(formData.duration || '60'),
        type: formData.consultationType || 'consultation',
        meeting_link: formData.contactMethod === 'videollamada' ? 'https://meet.google.com/new' : '',
        notes: formData.description || '',
        amount: clientAmount,
        currency: 'CLP',
        metadata: {
          payment_details: {
            original_amount: originalAmount,
            platform_fee: platformFee,
            lawyer_amount: lawyerAmount,
            preference_id: responseData.id
          }
        }
      };

      // Insert the appointment into the database
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) {
        console.error('Error creating appointment:', appointmentError);
        // Don't throw error here, as the payment was successful
      }
      
      localStorage.setItem('pendingAppointment', JSON.stringify(appointmentData));
      
      // Only use production URL
      const redirectUrl = responseData.init_point || responseData.url;
      if (redirectUrl) {
        const paymentUrl = new URL(redirectUrl);
        // Force production domain
        paymentUrl.hostname = 'www.mercadopago.cl';
        paymentUrl.protocol = 'https:';
        window.location.href = paymentUrl.toString();
        return;
      }
      
      throw new Error('No se recibió una URL de pago válida');
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      let errorMessage = 'Error al procesar el pago. Por favor, inténtalo de nuevo.';
      
      if (error instanceof Error) {
        console.error('Error al procesar el pago:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
        
        if (error.name === 'AbortError') {
          errorMessage = 'La solicitud ha excedido el tiempo de espera. Por favor, verifica tu conexión e inténtalo de nuevo.';
        } else if (error.message.includes('network') || error.message.includes('conexión')) {
          errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else {
        console.error('Error desconocido al procesar el pago:', error);
      }
      
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
      setFormData(prev => ({
        ...prev,
        hourlyRate: lawyer.hourly_rate.toString()
      }));
      
      // If we have a selected date, fetch availability
      if (selectedDate) {
        fetchAvailableSlots(selectedDate, lawyerId);
      }
    }
    
    // Update form data with the selected lawyer's default duration if not set
    if (!formData.duration) {
      setFormData(prev => ({
        ...prev,
        duration: '60' // Default to 60 minutes
      }));
    }
  };

  // CalendarField component for date selection
  const CalendarField = ({ formData, setFormData, lawyerAvailability }: any) => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        const formattedDate = format(date, 'yyyy-MM-dd');
        setFormData((prev: any) => ({
          ...prev,
          date: formattedDate
        }));
        setIsCalendarOpen(false);
      }
    };

    const isDateDisabled = (date: Date): boolean => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Disable past dates
      if (date < today) return true;
      
      // If no availability data, enable all future dates by default
      if (!lawyerAvailability) return false;
      
      const dayOfWeek = date.getDay();
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayKey = days[dayOfWeek];
      const dayAvailability = lawyerAvailability[dayKey];
      
      // If day has no availability array or all values are false, disable it
      if (!dayAvailability || !Array.isArray(dayAvailability)) {
        return true;
      }
      
      // Check if there's at least one available hour
      const hasAvailableHours = dayAvailability.some((hour: boolean) => hour === true);
      return !hasAvailableHours;
    };

    return (
      <div className="space-y-2">
        <Label htmlFor="date">Fecha *</Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.date && "text-muted-foreground",
                formData.date && "border-green-500 ring-0.5 ring-green-500"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.date ? format(new Date(formData.date), 'PPP', { locale: es }) : "Selecciona una fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.date ? new Date(formData.date) : undefined}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>
        {formData.date && (
          <Check 
            className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" 
            aria-hidden="true"
            strokeWidth={3}
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[425px] md:max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        overlayStyle={{
          '--tw-bg-opacity': 0.5,
          '--tw-backdrop-blur': 'blur(4px)',
        } as React.CSSProperties}
      >
        <DialogHeader className="sticky top-0 bg-background z-10 py-4 px-6 border-b border-border/50">
          <Button
            type="button"
            variant="ghost"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
          <DialogTitle>
            Solicitar asesoría con {selectedLawyerData?.name || lawyerName}
          </DialogTitle>
          <DialogDescription>
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
          
          {/* Moved specialty and lawyer selects below email */}
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
              setFormData={(newFormData) => {
                setFormData(prev => ({
                  ...prev,
                  date: newFormData.date,
                  time: '' // Reset time when date changes
                }));
              }}
              lawyerAvailability={lawyerAvailability || {}}
            />
            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <div className="relative">
                <Select
                  value={formData.time}
                  onValueChange={(value) => handleSelectChange("time", value)}
                  disabled={timeSlots.length === 0 || isLoadingAvailability}
                >
                  <SelectTrigger className={cn(
                    "w-full",
                    formData.time && "border-green-500 ring-0.5 ring-green-500",
                    (timeSlots.length === 0 || isLoadingAvailability) && "opacity-70"
                  )}>
                    <SelectValue placeholder={
                      isLoadingAvailability ? "Cargando horarios..." : 
                      timeSlots.length === 0 ? "No hay horarios disponibles para este día" : 
                      "Selecciona una hora"
                    } />
                  </SelectTrigger>
                    <SelectContent>
                      {isLoadingAvailability ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Cargando horarios disponibles...
                          </div>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <p>No hay horarios disponibles para este día.</p>
                          <p className="text-xs mt-1">Por favor, selecciona otra fecha.</p>
                        </div>
                      ) : (
                        timeSlots.map((time) => {
                          const [hours, minutes] = time.split(':').map(Number);
                          const selectedDateObj = new Date(formData.date);
                          const slotDateTime = new Date(selectedDateObj);
                          slotDateTime.setHours(hours, minutes, 0, 0);
                          
                          const isToday = selectedDateObj.toDateString() === new Date().toDateString();
                          
                          let isDisabled = false;
                          
                          // Only disable past times if it's today
                          if (isToday) {
                            const now = new Date();
                            const currentHours = now.getHours();
                            const currentMinutes = now.getMinutes();
                            
                            // Disable only if the time has already passed
                            isDisabled = hours < currentHours || 
                                       (hours === currentHours && minutes < currentMinutes);
                          }
                          
                          // Check if the time slot is already booked
                          const isBooked = bookedSlots.has(time);
                          const isDisabledSlot = isDisabled || isBooked;
                          
                          return (
                            <SelectItem 
                              key={time} 
                              value={time}
                              disabled={isDisabledSlot}
                              className={cn(
                                'px-4 py-2',
                                isBooked ? 'opacity-50 cursor-not-allowed' : '',
                                isBooked ? 'line-through' : '',
                                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                              )}
                              title={isBooked ? 'Este horario ya está reservado' : ''}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{time}</span>
                                {isBooked && <span className="text-xs text-muted-foreground ml-auto">No disponible</span>}
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
            {selectedLawyer ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Tarifa por hora</span>
                  <span className="font-medium">
                    {formatCurrency(selectedLawyerData?.hourly_rate || 0)}/hora
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
                    <span className="text-gray-600">Recargo por gestión (10%)</span>
                    <span className="ml-1 text-xs text-gray-500">*</span>
                  </div>
                  <span className="text-gray-600">
                    +{formatCurrency(Math.ceil(estimatedCost * 0.1))}
                  </span>
                </div>

                <div className="border-t border-gray-200 my-1"></div>

                <div className="flex justify-between items-center">
                  <span className="text-base font-bold">Total a pagar</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(clientAmount)}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  * Incluye 10% de recargo por gestión de pago seguro a través de MercadoPago.
                </p>

                {clientAmount < 1000 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Se aplica un monto mínimo de $1.000 CLP para pagos con tarjeta.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-medium pt-1">Costo estimado:</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-black-600 block">
                      {selectedLawyer ? `$${selectedLawyer.price}` : "$0"}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Selecciona un abogado para ver el costo.
                </p>
              </div>
            )}
          </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !selectedLawyer}
                className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-70"
              >
                {isProcessing 
                  ? "Procesando..." 
                  : selectedLawyer 
                    ? `Pagar ${formatCurrency(clientAmount)}`
                    : 'Selecciona un abogado'}
              </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}