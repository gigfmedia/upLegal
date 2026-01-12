import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, User, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, startOfDay, parseISO, isBefore, isAfter, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { isChileanHoliday } from '@/lib/holidays';
import PreCheckoutModal from '@/components/PreCheckoutModal';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface LawyerProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  specialties: string[];
  avatar_url: string;
  hourly_rate_clp: number;
  bio: string;
  pjud_verified: boolean;
  availability?: Record<string, boolean[]> | string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

type BusySlot = {
  scheduled_time: string;
  duration: number;
};

export default function BookingPage() {
  const { lawyerId } = useParams<{ lawyerId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [lawyerAvailability, setLawyerAvailability] = useState<Record<string, boolean[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<30 | 60 | 90 | 120>(60);
  const [showPreCheckout, setShowPreCheckout] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Fetch lawyer profile
  useEffect(() => {
    async function fetchLawyer() {
      if (!lawyerId) return;

      // Extract UUID from the URL parameter (which might be "slug-uuid")
      // UUIDs are 36 characters long. If the param is longer, we assume it's slug-uuid.
      const actualId = lawyerId.length > 36 ? lawyerId.slice(-36) : lawyerId;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, specialties, avatar_url, hourly_rate_clp, bio, pjud_verified, availability')
        .eq('user_id', actualId)
        .eq('role', 'lawyer')
        .single();

      if (error) {
        console.error('Error fetching lawyer:', error);
        // Only redirect if it's a real error, not just loading
        if (error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
             navigate('/search');
        }
        return;
      }

      if (!data) {
        console.error('Lawyer not found');
        navigate('/search');
        return;
      }

      let parsedAvailability: Record<string, boolean[]> | null = null;
      if (data.availability) {
        try {
          const rawAvailability = typeof data.availability === 'string'
            ? JSON.parse(data.availability)
            : data.availability;

          if (rawAvailability && typeof rawAvailability === 'object') {
            parsedAvailability = rawAvailability as Record<string, boolean[]>;
          }
        } catch (parseError) {
          console.warn('Error parsing lawyer availability config, defaulting to legacy behavior:', parseError);
        }
      }

      setLawyer({ ...data, availability: parsedAvailability ?? data.availability ?? null });
      setLawyerAvailability(parsedAvailability);
      setLoading(false);
    }

    fetchLawyer();
    fetchLawyer();
  }, [lawyerId, navigate]);

  // Track booking_start event when lawyer data is loaded
  useEffect(() => {
    if (lawyer?.user_id && window.gtag) {
      window.gtag('event', 'booking_start', {
        lawyer_id: lawyer.user_id,
        lawyer_name: `${lawyer.first_name} ${lawyer.last_name}`
      });
    }
  }, [lawyer]);

  // Constants mapping indices to hours for availability JSON
  // ManageAvailability.tsx: const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00–20:00 (Check: 9+9=18, so 09:00 to 18:00 start times)
  // ManageAvailability stores boolean array where index 0 = 9:00, index 1 = 10:00, etc.
  const AVAILABILITY_START_HOUR = 9;

  // Helper to get Day string for availability JSON key
  const getDayName = useCallback((date: Date) => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return days[date.getDay()];
  }, []);

  const normalizeDayKey = useCallback((key: string) =>
    key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  []);

  const getAvailabilityForDay = useCallback((
    availability: Record<string, unknown> | null,
    dayName: string
  ): boolean[] | null => {
    if (!availability) return null;

    const targetKey = normalizeDayKey(dayName);

    for (const [key, value] of Object.entries(availability)) {
      if (normalizeDayKey(key) === targetKey && Array.isArray(value)) {
        return value as boolean[];
      }
    }

    return null;
  }, [normalizeDayKey]);

  // Generate available time slots for selected date
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    // Fetch busy slots from DB
    const fetchAvailability = async () => {
      // 1. Generate base slots
      const baseSlots: TimeSlot[] = [];
      const isSaturday = selectedDate.getDay() === 6;
      const endHour = isSaturday ? 14 : 18;
      const needsExtendedSlot = !isSaturday;

      for (let hour = 9; hour < endHour; hour++) {
        const minutes = duration >= 60 ? [0] : [0, 30];
        for (const minute of minutes) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          baseSlots.push({ time, available: true });
        }
      }

      if (needsExtendedSlot) {
        const extraMinutes = duration >= 60 ? [0] : [0, 30];
        extraMinutes.forEach(minute => {
          const time = `18:${minute.toString().padStart(2, '0')}`;
          baseSlots.push({ time, available: true });
        });
      }

      const applySameDayFilter = (slots: TimeSlot[]) => {
        const now = new Date();
        if (selectedDate.toDateString() !== now.toDateString()) {
          return slots;
        }

        const cutoff = new Date(now.getTime() + 15 * 60 * 1000);

        return slots.filter((slot) => {
          const [slotHour, slotMinute] = slot.time.split(':').map(Number);
          const slotDateTime = new Date(selectedDate);
          slotDateTime.setHours(slotHour, slotMinute, 0, 0);
          return slotDateTime.getTime() >= cutoff.getTime();
        });
      };

      try {
        setIsLoadingSlots(true); // Only show loading in slots area
        
        // Call RPC
        const { data: busySlots, error } = await supabase
          .rpc('get_lawyer_busy_slots', {
            query_lawyer_id: lawyerId,
            query_date: format(selectedDate, 'yyyy-MM-dd')
          });

        if (error) {
          console.error('Error fetching availability:', error);
          const filtered = applySameDayFilter(baseSlots);
          if (selectedTime && !filtered.some(slot => slot.time === selectedTime)) {
            setSelectedTime(null);
          }
          setAvailableSlots(filtered);
          return;
        }

        // 2. Fetch lawyer availability settings (JSON)
        // We already fetched lawyer profile in the other effect, but we didn't store the availability JSON.
        // It's better to fetch it here to ensure we have the latest or refactor to store it in 'lawyer' state.
        // For simplicity and to avoid race conditions with state updates, let's fetch it or use the 'lawyer' state if we add the field to it.
        // Let's assume we update the initial fetch to include 'availability'.

        let availabilityConfig: Record<string, boolean[]> | null = lawyerAvailability;

        if ((!availabilityConfig || Object.keys(availabilityConfig).length === 0) && lawyerId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('availability')
            .eq('user_id', lawyerId)
            .single();

          if (profileData?.availability) {
            try {
              const rawAvail =
                typeof profileData.availability === 'string'
                  ? JSON.parse(profileData.availability)
                  : profileData.availability;

              if (rawAvail && typeof rawAvail === 'object') {
                availabilityConfig = rawAvail as Record<string, boolean[]>;
                setLawyerAvailability(availabilityConfig);
              }
            } catch (parseError) {
              console.warn('Error parsing lawyer availability config, defaulting to open or closed defaults based on logic:', parseError);
            }
          }
        }

        const dayName = getDayName(selectedDate);
        const dayAvailability = getAvailabilityForDay(availabilityConfig, dayName);
        const hasCustomAvailability = availabilityConfig && Object.keys(availabilityConfig).length > 0;

        // 3. Filter base slots based on Lawyer Config
        const configFilteredSlots = baseSlots.filter(slot => {
            const hour = parseInt(slot.time.split(':')[0]);
            const hourIndex = hour - AVAILABILITY_START_HOUR;

            if (dayAvailability && Array.isArray(dayAvailability)) {
              return dayAvailability[hourIndex] === true;
            }

            if (hasCustomAvailability) {
              return false;
            }

            // Default to OPEN only if NO configuration exists at all (legacy support)
            return true;
        });

        // 4. Fetch busy slots from DB (Bookings) - defined above, now map them
        const bookedTimes = (busySlots as BusySlot[] | null)?.map((slot) => ({
          time: slot.scheduled_time.slice(0, 5), // "09:00:00" -> "09:00"
          duration: slot.duration
        })) || [];

        // 5. Collision detection with Bookings
        const finalSlots = configFilteredSlots.map(slot => {
          const slotTimeVal = parseInt(slot.time.replace(':', ''));
          const slotEndVal = addMinutesToTime(slotTimeVal, duration);

          const isBlocked = bookedTimes.some((booked) => {
            const bookedStart = parseInt(booked.time.replace(':', ''));
            const bookedEnd = addMinutesToTime(bookedStart, booked.duration);

            // Check overlap: (StartA < EndB) and (EndA > StartB)
            return (slotTimeVal < bookedEnd) && (slotEndVal > bookedStart);
          });

          return { ...slot, available: !isBlocked };
        });

        const filteredSlots = applySameDayFilter(finalSlots);

        if (selectedTime && !filteredSlots.some(slot => slot.time === selectedTime)) {
          setSelectedTime(null);
        }

        setAvailableSlots(filteredSlots);

      } catch (err) {
        console.error('Failed to check availability', err);
        const filtered = applySameDayFilter(baseSlots);
        if (selectedTime && !filtered.some(slot => slot.time === selectedTime)) {
          setSelectedTime(null);
        }
        setAvailableSlots(filtered);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, duration, lawyerId, lawyerAvailability, selectedTime, getDayName, getAvailabilityForDay]);

  // Helper to add minutes to HHMM integer (e.g. 900 + 60 => 1000)
  // This is a bit hacky, cleaner to use Date objects but sufficient for static slots
  const addMinutesToTime = (timeVal: number, minutes: number) => {
    const hours = Math.floor(timeVal / 100);
    const mins = timeVal % 100;
    const date = new Date(2000, 0, 1, hours, mins);
    date.setMinutes(date.getMinutes() + minutes);
    return date.getHours() * 100 + date.getMinutes();
  };

  const getAuthenticatedUserName = () => {
    const metadata = user?.user_metadata || {};
    const fullName = metadata.full_name
      || [metadata.first_name, metadata.last_name].filter(Boolean).join(' ')
      || metadata.name;
    if (fullName && fullName.trim().length > 0) {
      return fullName.trim();
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Cliente LegalUp';
  };

  const handleAuthenticatedCheckout = async (userName: string, userEmail: string) => {
    if (!selectedDate || !selectedTime || !lawyer) return;

    setIsProcessingPayment(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lawyer_id: lawyer.user_id,
          user_email: userEmail,
          user_name: userName,
          scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
          scheduled_time: selectedTime,
          duration,
          price: totalPrice
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la reserva');
      }

      if (window.gtag) {
        window.gtag('event', 'lead_created', {
          lawyer_id: lawyer.user_id,
          duration,
          price: totalPrice
        });
      }

      if (data.payment_link) {
        if (window.gtag) {
          window.gtag('event', 'begin_checkout', {
            booking_id: data.booking_id,
            value: totalPrice,
            currency: 'CLP',
            items: [{
              item_id: data.booking_id,
              item_name: `Asesoría con ${lawyer.first_name} ${lawyer.last_name}`,
              price: totalPrice,
              quantity: 1
            }]
          });
        }

        window.location.href = data.payment_link;
      } else {
        throw new Error('No se recibió el link de pago');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear la reserva',
        variant: 'destructive'
      });
      setIsProcessingPayment(false);
    }
  };

  const availableDates = useMemo(() => {
    const dates = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(new Date()), i));

    return dates
      .filter(date => date.getDay() !== 0)
      .filter(date => {
        if (!lawyerAvailability || Object.keys(lawyerAvailability).length === 0) {
          return true;
        }

        const dayAvailability = getAvailabilityForDay(lawyerAvailability, getDayName(date));
        return Array.isArray(dayAvailability) ? dayAvailability.some(Boolean) : false;
      })
      .filter(date => !isChileanHoliday(date));
  }, [lawyerAvailability, getDayName, getAvailabilityForDay]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset time when date changes
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    
    // Track time_selected event
    if (window.gtag && lawyer?.user_id && selectedDate) {
      window.gtag('event', 'time_selected', {
        lawyer_id: lawyer.user_id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: time
      });
    }
  };

  const handleContinue = async () => {
    if (!selectedDate || !selectedTime) return;
    if (isProcessingPayment) return;

    if (isAuthenticated && user) {
      if (!user.email) {
        toast({
          title: 'Cuenta sin email',
          description: 'Tu cuenta no tiene un email válido. Completa tus datos para continuar con el pago.',
          variant: 'destructive'
        });
        setShowPreCheckout(true);
        return;
      }

      await handleAuthenticatedCheckout(getAuthenticatedUserName(), user.email);
    } else {
      setShowPreCheckout(true);
    }
  };

  const calculateLawyerFee = () => {
    if (!lawyer) return 0;
    switch (duration) {
      case 30: return Math.round(lawyer.hourly_rate_clp / 2);
      case 60: return lawyer.hourly_rate_clp;
      case 90: return Math.round(lawyer.hourly_rate_clp * 1.5);
      case 120: return lawyer.hourly_rate_clp * 2;
      default: return lawyer.hourly_rate_clp;
    }
  };

  const lawyerFee = calculateLawyerFee();
  const serviceFee = Math.round(lawyerFee * 0.10); // 10% service fee
  const totalPrice = lawyerFee + serviceFee;

  const BookingSkeleton = () => (
    <div className="space-y-6">
      {/* Lawyer Info Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duration Selection Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Date and Time Selection Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Picker Skeleton */}
            <div>
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-3 gap-2 h-64">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            </div>
            
            {/* Time Picker Skeleton */}
            <div>
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-2 h-64">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-8 px-4 pt-24">
          <div className="max-w-4xl mx-auto">
            <BookingSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!lawyer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4 pt-24">
      <div className="max-w-4xl mx-auto">

        {/* Lawyer Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <img
                src={lawyer.avatar_url || '/default-avatar.png'}
                alt={`${lawyer.first_name} ${lawyer.last_name}`}
                className="w-20 h-20 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {lawyer.first_name} {lawyer.last_name}
                  </h1>
                  {lawyer.pjud_verified && (
                    <Badge variant="secondary" className="bg-green-50 text-green-800 flex items-center gap-1 w-fit mt-1 md:mt-0">
                      <div className="p-[2px]">
                        <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <span className="text-xs font-medium text-green-700">
                        Verificado PJUD
                      </span>
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lawyer.specialties?.map((specialty, index) => (
                    <Badge key={index} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>
                {lawyer.bio && (
                  <p className="text-gray-600 mt-3 line-clamp-2">{lawyer.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>Agenda tu asesoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Duration Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setDuration(30)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    duration === 30
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">30 minutos</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ${Math.round(lawyer.hourly_rate_clp / 2).toLocaleString('es-CL')}
                  </div>
                </button>
                <button
                  onClick={() => setDuration(60)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    duration === 60
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">60 minutos</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ${lawyer.hourly_rate_clp.toLocaleString('es-CL')}
                  </div>
                </button>
                <button
                  onClick={() => setDuration(90)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    duration === 90
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">90 minutos</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ${Math.round(lawyer.hourly_rate_clp * 1.5).toLocaleString('es-CL')}
                  </div>
                </button>
                <button
                  onClick={() => setDuration(120)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    duration === 120
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">120 minutos</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ${(lawyer.hourly_rate_clp * 2).toLocaleString('es-CL')}
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona una fecha:
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-2">
                  {availableDates.map((date) => (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateSelect(date)}
                      className={`p-3 border-2 rounded-lg transition-all text-center ${
                        selectedDate?.toDateString() === date.toDateString()
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs text-gray-500">
                        {format(date, 'EEE', { locale: es })}
                      </div>
                      <div className="text-lg font-semibold">
                        {format(date, 'd', { locale: es })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(date, 'MMM', { locale: es })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona un horario:
                </label>
                {selectedDate ? (
                  <>
                  <div className={`grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2 ${isLoadingSlots ? 'opacity-50' : ''}`}>
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot.time)}
                        disabled={!slot.available || isLoadingSlots}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedTime === slot.time
                            ? 'border-blue-600 bg-blue-50'
                            : slot.available
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-4">Este horario se libera automáticamente si no se confirma el pago</p>
                  </>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm bg-gray-50">
                    <Calendar className="h-8 w-8 mb-2 opacity-50" />
                    <span>Selecciona una fecha primero</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary and Continue */}
            {selectedDate && selectedTime && (
              <div className="border-t pt-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">
                      {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Hora:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duración:</span>
                    <span className="font-medium">{duration} minutos</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Honorarios abogado:</span>
                    <span className="font-medium">${lawyerFee.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-600">Tarifa por servicio</span>
                      <span className="ml-1 text-xs text-gray-500">*</span>
                    </div>
                    <span className="font-medium text-gray-600">+${serviceFee.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>Total a pagar:</span>
                    <span className="text-blue-600">${totalPrice.toLocaleString('es-CL')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    * Incluye 10% de recargo por servicio app.
                  </p>
                </div>

                <Button
                  onClick={handleContinue}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-sm py-6"
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirigiendo...
                    </>
                  ) : (
                    'Continuar al pago'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pre-checkout Modal */}
      {showPreCheckout && selectedDate && selectedTime && (
        <PreCheckoutModal
          isOpen={showPreCheckout}
          onClose={() => setShowPreCheckout(false)}
          bookingData={{
            lawyer_id: lawyer.user_id,
            lawyer_name: `${lawyer.first_name} ${lawyer.last_name}`,
            scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
            scheduled_time: selectedTime,
            duration,
            price: totalPrice
          }}
        />
      )}
      </div>
    </div>
  );
}
