import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, CheckCircle, MessageCircle, Calendar, User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthModal } from "./AuthModal";

import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { LawyerRatings } from "./ratings/LawyerRatings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface Lawyer {
  id: string;
  user_id?: string;
  name: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  specialties: string[] | string;
  rating: number;
  reviews: number;
  location: string;
  cases: number;
  hourlyRate: number;
  consultationPrice: number;
  contact_fee_clp?: number;
  image: string;
  bio: string;
  verified: boolean;
  pjud_verified?: boolean;
  blocked?: boolean;
  availability: {
    availableToday: boolean;
    availableThisWeek: boolean;
    quickResponse: boolean;
    emergencyConsultations: boolean;
  };
  availableToday?: boolean;
  availableThisWeek?: boolean;
  quickResponse?: boolean;
  emergencyConsultations?: boolean;
  experience_years?: number;
  review_count?: number;
  availability_config?: Record<string, boolean[]>; // Raw availability config from DB
}

interface LawyerCardProps {
  lawyer: Lawyer;
  user?: any; // Add user prop
  onContactClick?: () => void;
  onScheduleClick?: () => void;
  onContact?: () => void; // Old prop name for backward compatibility
  onSchedule?: () => void; // Old prop name for backward compatibility
}

const formatCLP = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Utility to optimize image URL for Supabase storage
const getOptimizedImageUrl = (url: string, width = 256, quality = 80) => {
  if (!url) return '';
  
  // Temporarily disable Supabase transformations to test
  // This might be causing the zoom/distortion issues
  return url;
};

export function LawyerCard({ 
  lawyer, 
  onContactClick, 
  onScheduleClick, 
  onContact, 
  onSchedule,
  user
}: LawyerCardProps & { user?: any }) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Handle image load to detect actual dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const size = { width: img.naturalWidth, height: img.naturalHeight };
    setImageSize(size);
    setImageLoaded(true);
    const needsZoomCondition = size.width < 100 || size.height < 100 || 
      Math.abs(size.width - size.height) > 20 || Math.min(size.width, size.height) < 80;
  };
  
  // Calculate if image needs zoom (smaller than container or not square enough)
  const needsZoom = imageLoaded && (
    imageSize.width < 100 || 
    imageSize.height < 100 || 
    Math.abs(imageSize.width - imageSize.height) > 20 || // Not square (difference > 20px)
    Math.min(imageSize.width, imageSize.height) < 80
  );
  const zoomScale = needsZoom ? 1.5 : 1;
  
  const displayName = React.useMemo(() => {
    // If we have both first and last name, use them
    if (lawyer.first_name && lawyer.last_name) {
      return `${lawyer.first_name} ${lawyer.last_name}`.trim();
    }
    // If we have just first name
    if (lawyer.first_name) return lawyer.first_name;
    // If we have just last name
    if (lawyer.last_name) return lawyer.last_name;
    // Fall back to display_name or name
    return lawyer.display_name || lawyer.name || 'Abogado';
  }, [lawyer.first_name, lawyer.last_name, lawyer.display_name, lawyer.name]);
  // Check if the current user is the owner of this lawyer profile
  const isOwnProfile = Boolean(
    user?.id && 
    (user.id === lawyer.user_id || user.id === lawyer.id)
  );
  
  // Check if the lawyer is verified and has the required fields
  const hasVerificationFlag = Boolean(lawyer.verified || lawyer.pjud_verified);
  const isVerifiedLawyer = Boolean(
    hasVerificationFlag &&
    lawyer.hourlyRate > 0 &&
    lawyer.bio && 
    lawyer.bio.trim() !== '' && 
    lawyer.specialties && 
    lawyer.specialties.length > 0 &&
    lawyer.location && 
    lawyer.location.trim() !== ''
  );
  
  // Determine if buttons should be disabled
  const buttonsDisabled = isOwnProfile || !isVerifiedLawyer;
  
  // Debug logs - only log if we have a user to reduce noise
  if (user?.id) {
    console.debug('LawyerCard - User ID:', user.id);
    console.debug('LawyerCard - Lawyer ID:', lawyer.id, 'User ID:', lawyer.user_id);
    console.debug('isOwnProfile:', isOwnProfile, 'isVerifiedLawyer:', isVerifiedLawyer);
  }


  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRatingsDialog, setShowRatingsDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { user: authUser } = useAuth();
  const [currentRating, setCurrentRating] = useState(lawyer.rating);
  const [currentReviewCount, setCurrentReviewCount] = useState(lawyer.reviews);
  
  // Check if user has already used their free consultation
  const hasUsedFreeConsultation = user?.user_metadata?.hasUsedFreeConsultation || false;
  const hasFreeConsultation = !!user && !hasUsedFreeConsultation;
  
  const navigate = useNavigate();

  const clientSurchargePercent = 0.1;

  // Redondear a miles: < 500 → abajo, ≥ 500 → arriba
  const roundToThousands = (amount: number): number => {
    return Math.round(amount / 1000) * 1000;
  };

  const displayHourlyRate = roundToThousands(lawyer.hourlyRate * (1 + clientSurchargePercent));

  // Helper to normalize day names for availability lookup
  const normalizeDayKey = (key: string) =>
    key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Helper to check if lawyer has any slots for a given day
  const hasAvailabilityForDay = (dayName: string): boolean => {
    if (!lawyer.availability_config) return false;
    try {
      const schedule = lawyer.availability_config;
      const normalizedDay = normalizeDayKey(dayName);
      const dayKey = Object.keys(schedule).find(k => normalizeDayKey(k) === normalizedDay);
      
      if (dayKey && Array.isArray(schedule[dayKey])) {
        return schedule[dayKey].some((slot: boolean) => slot === true);
      }
    } catch (e) {
      console.error('Error checking availability:', e);
    }
    return false;
  };

  // Helper to check if lawyer has slots left for the current day (future hours)
  const hasFutureSlotsToday = (): boolean => {
    if (!lawyer.availability_config) return false;
    try {
      const today = new Date();
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const todayName = dayNames[today.getDay()];
      const normalizedDay = normalizeDayKey(todayName);
      
      const schedule = lawyer.availability_config;
      const dayKey = Object.keys(schedule).find(k => normalizeDayKey(k) === normalizedDay);
      
      if (dayKey && Array.isArray(schedule[dayKey])) {
        const currentHour = today.getHours();
        // Slots are 9:00 (index 0) to 18:00 (index 9)
        return schedule[dayKey].some((slot: boolean, index: number) => {
          if (!slot) return false;
          const slotHour = 9 + index;
          return slotHour > currentHour; // Only count future slots
        });
      }
    } catch (e) {
      console.error('Error checking future slots:', e);
    }
    return false;
  };

  // Determine availability text based on current day and availability flag
  const getAvailabilityDisplay = (): { text: string; showPulse: boolean; shouldShow: boolean } => {
    // Only show if lawyer has configured at least one price
    if (!(lawyer.consultationPrice > 0 || lawyer.hourlyRate > 0)) {
      return { text: '', showPulse: false, shouldShow: false };
    }

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayName = dayNames[dayOfWeek];

    // Fallback logic for lawyers without a specific availability_config
    if (!lawyer.availability_config) {
      if (lawyer.verified) {
        // Assume default availability for verified lawyers if no config is set
        if ([1, 2, 3, 4, 5].includes(dayOfWeek)) {
          // Mon-Fri
          return { text: 'Disponible hoy', showPulse: true, shouldShow: true };
        } else {
          // Weekend
          return { text: 'Disponible lunes', showPulse: false, shouldShow: true };
        }
      }
      return { text: '', showPulse: false, shouldShow: false };
    }

    // If the system directly reports they are available today (have future hours)
    // Or if we can verify they have future availability today from the config
    if (lawyer.availability?.availableToday || lawyer.availableToday || hasFutureSlotsToday()) {
      // If it's late (after 6 PM), or if we don't have future slots today but have tomorrow
      const currentHour = today.getHours();
      const tomorrowIndex = (dayOfWeek + 1) % 7;
      const tomorrowName = dayNames[tomorrowIndex];
      const hasTomorrow = hasAvailabilityForDay(tomorrowName);
      
      if (currentHour >= 18 && hasTomorrow) {
        return { text: 'Disponible mañana', showPulse: false, shouldShow: true };
      }
      
      return { text: 'Disponible hoy', showPulse: true, shouldShow: true };
    }

    // If today is over or they weren't available today, check tomorrow
    const tomorrowIndex = (dayOfWeek + 1) % 7;
    const tomorrowName = dayNames[tomorrowIndex];

    const hasTomorrow = hasAvailabilityForDay(tomorrowName);

    if (hasTomorrow) {
      return { text: 'Disponible mañana', showPulse: false, shouldShow: true };
    }

    // If not available tomorrow, and it's Fri/Sat/Sun, check Monday
    if ([5, 6, 0].includes(dayOfWeek)) {
      if (hasAvailabilityForDay('Lunes')) {
        return { text: 'Disponible lunes', showPulse: false, shouldShow: true };
      }
    }

    // If they have any availability this week as a fallback
    if (lawyer.availability?.availableThisWeek || lawyer.availableThisWeek) {
      return { text: 'Disponible esta semana', showPulse: false, shouldShow: true };
    }

    return { text: '', showPulse: false, shouldShow: false };
  };

  const availabilityDisplay = getAvailabilityDisplay();
  const shouldShowAvailabilityBadge = availabilityDisplay.shouldShow;

  // Handle contact button click
  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    if (onContactClick) onContactClick();
    else if (onContact) onContact();
  };
  
  // Create URL-friendly slug from lawyer's name
  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD') // Decompose combined characters (e.g. "ñ" -> "n" + "~")
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/(^-|-$)/g, ''); // Remove leading/trailing hyphens
  };

  // Handle schedule button click
  const handleScheduleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // New flow: Redirect to booking page without auth check
    const lawyerName = lawyer.name || `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim();
    const nameSlug = lawyerName ? createSlug(lawyerName) : 'abogado';
    navigate(`/booking/${nameSlug}-${lawyer.user_id || lawyer.id}`);
  };
  
  return (
    <>
      <Card 
        className={`hover:shadow-lg transition-shadow duration-300 border border-solid flex flex-col h-full cursor-pointer ${lawyer.blocked ? 'opacity-50 bg-gray-50 cursor-not-allowed' : ''}`}
        onClick={(e) => {
          // Don't navigate if lawyer is blocked
          if (lawyer.blocked) {
            e.preventDefault();
            return;
          }
          // Don't navigate if clicking on the schedule button or its children
          if ((e.target as HTMLElement).closest('button, [role="button"], a')) {
            return;
          }
          const nameSlug = (lawyer.name || 'abogado')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          navigate(`/abogado/${nameSlug}-${lawyer.id}`);
        }}
      >
        <div className="flex-1 flex flex-col p-6 min-h-[300px] relative">
          {/* Sección superior - Info básica */}
          <div className="flex justify-between items-start w-full">
            <div className="flex space-x-4 w-full">
              <div className="relative">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={getOptimizedImageUrl(lawyer.image, 256)} 
                      alt={lawyer.name}
                      className="object-contain"
                      style={{
                        // Apply zoom only if image is smaller than container
                        transform: `scale(${zoomScale})`,
                        transition: 'transform 0.2s ease-in-out'
                      }}
                      onLoad={handleImageLoad}
                      loading="lazy"
                    />
                    <AvatarFallback className="bg-green-900 text-green-600 text-xl font-medium">
                      {(() => {
                        const nameParts = lawyer.name.split(' ').filter(n => n);
                        if (nameParts.length === 0) return '?';
                        if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
                        // Take first letter of first word and first letter of last word
                        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
                      })()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between w-full mb-1 gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate" 
                      title={displayName}>
                    {displayName}
                  </h3>
                  {/*{lawyer.hourlyRate > 60000 && (
                    <div className="flex-shrink-0">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        🏅 Premium
                      </div>
                    </div>
                  )}*/}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {shouldShowAvailabilityBadge && (
                    <Badge variant="secondary" className={`w-fit flex items-center gap-1.5 ${availabilityDisplay.showPulse ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-green-100 text-green-800 hover:bg-green-200'} border-none`}>
                      {availabilityDisplay.showPulse && <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />}
                      {availabilityDisplay.text}
                    </Badge>
                  )}
                  
                  {hasVerificationFlag && (
                    <Badge variant="secondary" className="w-fit flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                      <ShieldCheck className="h-3 w-3" />
                      {lawyer.pjud_verified ? 'Verificado en PJUD' : 'Verificado en PJUD'}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center text-sm text-gray-600 space-x-2 w-full overflow-hidden mb-1">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span 
                    className="truncate block w-full max-w-[180px]" 
                    title={lawyer.location || 'Ubicación no disponible'}
                  >
                    {lawyer.location || 'Ubicación no disponible'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm mt-2 mb-2">
                  {currentReviewCount > 0 && (
                    <div className="flex-1">
                      <button 
                        className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nameSlug = (lawyer.name || 'abogado')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '');
                          navigate(`/abogado/${nameSlug}-${lawyer.id}#reviews-section`);
                        }}
                      >
                        <Star className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />
                        <span className="font-medium">{currentRating.toFixed(1)}</span>
                        <span className="text-gray-400">({currentReviewCount})</span>
                      </button>
                    </div>
                  )}
                  {displayName.toLowerCase().includes('jorge') && displayName.toLowerCase().includes('pacheco') && (
                    <div className="text-xs text-gray-500 italic text-[11px]">
                      Casos complejos · Alta experiencia
                    </div>
                  )}
                  <span className="text-blue-600 font-medium flex-shrink-0">
                    {/*  {lawyer.cases ? lawyer.cases.toLocaleString() : '0'} casos */}
                  </span>
                </div>
              </div>
            </div>
          </div>
            

          {/* Contenido con alineación fija */}
          <div className="flex flex-col h-full">
            <div className="space-y-4 pt-2">
              {/* Especialidades */}
              <div className="min-h-[40px]">
                <div className="flex flex-wrap gap-2 items-start">
                  {(Array.isArray(lawyer.specialties) 
                    ? lawyer.specialties.flatMap(s => 
                        typeof s === 'string' ? s.split(',').map(x => x.trim()) : []
                      )
                    : typeof lawyer.specialties === 'string'
                      ? lawyer.specialties.split(',').map(s => s.trim())
                      : []
                  )
                  .filter(s => s) // Remove empty strings
                  .slice(0, 3) // Limit to 3 specialties
                  .map((specialty, index) => (
                    <Badge 
                      key={`${specialty}-${index}`} 
                      variant="secondary" 
                      className="text-xs font-normal bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap"
                    >
                      {specialty}
                    </Badge>
                  ))}
                  {((Array.isArray(lawyer.specialties) ? lawyer.specialties.length : 0) > 3 || 
                   (typeof lawyer.specialties === 'string' && lawyer.specialties.split(',').length > 3)) && (
                    <span className="text-xs text-gray-500 self-center">
                      +{Math.max(0, (Array.isArray(lawyer.specialties) ? lawyer.specialties.length : lawyer.specialties.split(',').length) - 3)} más
                    </span>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div className="max-w-full flex-1">
                {lawyer.bio && typeof lawyer.bio === 'string' && lawyer.bio.trim() !== '' ? (
                  <div className="text-gray-700 text-sm">
                    <p className="overflow-hidden text-ellipsis" style={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineClamp: 2,
                      maxHeight: '2.8em',
                      lineHeight: '1.4em',
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {lawyer.bio}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-700 text-sm" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineClamp: 2,
                    maxHeight: '2.8em',
                    lineHeight: '1.4em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    Este abogado no ha proporcionado una descripción.
                  </p>
                )}
              </div>
            </div>

            {/* Precio y rating - Siempre al final */}
            <div className="mt-auto pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-2xl font-bold text-gray-900">
                    ${formatCLP(displayHourlyRate)}
                  </span>
                  {/* <span className="text-gray-500 text-sm ml-1">/hora</span> */}
                  <small className="text-gray-500 text-xs block">Asesoría online · hasta 60 min</small>
                  <small className="text-gray-500 text-xs block mt-1">La duración puede variar según el caso y la disponibilidad del abogado</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción - Fijos en la parte inferior */}
        <div className="p-6 pt-4 mt-auto border-t border-gray-100">
          <div className="flex space-x-2 w-full">
            {/* <Button 
              variant="outline" 
              className={`flex-1 bg-white border-gray-300 ${
                buttonsDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={handleContactClick}
              disabled={buttonsDisabled}
              title={!isVerifiedLawyer ? 'Este abogado tiene un perfil incompleto' : ''}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {buttonsDisabled && !isOwnProfile ? 'No disponible' : 'Contactar'}
            </Button> */}
            <Button
              variant="default"
              className={`flex-1 bg-gray-900 text-white dark:bg-gray-900 dark:text-white [color-scheme:light] font-medium shadow-sm transition ${
                buttonsDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-green-900 active:scale-[0.98]'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleScheduleClick(e);
              }}
              disabled={buttonsDisabled}
              title={!isVerifiedLawyer ? 'Este abogado tiene un perfil incompleto' : ''}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {buttonsDisabled && !isOwnProfile ? 'No disponible' : 'Ver disponibilidad'}
            </Button>
            
          </div>
          <p className="text-gray-700 text-xs text-center pt-2">Pago seguro · Orientación directa</p>
          {buttonsDisabled && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {isOwnProfile 
                ? 'No puedes contactar ni agendar contigo mismo' 
                : 'Este abogado tiene un perfil incompleto'}
            </p>
          )}
        </div>
      </Card>

      {/* Ratings Dialog */}
      <Dialog open={showRatingsDialog} onOpenChange={setShowRatingsDialog}>
        <DialogContent className="max-w-3xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg" aria-describedby="ratings-dialog-description">
          <DialogHeader>
            <DialogTitle>Reseñas y calificaciones</DialogTitle>
            <DialogDescription id="ratings-dialog-description">
              Opiniones de clientes sobre {lawyer.name}
            </DialogDescription>
          </DialogHeader>
          
          <LawyerRatings 
            lawyerId={lawyer.id}
            averageRating={currentRating}
            ratingCount={currentReviewCount}
            onRatingUpdate={(newAverage, newCount) => {
              setCurrentRating(newAverage);
              setCurrentReviewCount(newCount);
            }}
          />
        </DialogContent>
      </Dialog>



      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
    );
  }
