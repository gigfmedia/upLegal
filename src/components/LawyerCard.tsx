import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, CheckCircle, MessageCircle, Calendar, User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthModal } from "./AuthModal";
import { ContactModal } from "./ContactModal";
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
  specialties: string[];
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

export function LawyerCard({ 
  lawyer, 
  onContactClick, 
  onScheduleClick, 
  onContact, 
  onSchedule,
  user
}: LawyerCardProps & { user?: any }) {
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

  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
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
  
  // Handle schedule button click
  const handleScheduleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    if (onScheduleClick) onScheduleClick();
    else if (onSchedule) onSchedule();
  };
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md flex flex-col h-full">
        <div className="flex-1 flex flex-col p-6 min-h-[300px] relative">
          {/* Sección superior - Info básica */}
          <div className="flex justify-between items-start mb-4 w-full">
            <div className="flex space-x-4 flex-1">
              <div className="relative">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={lawyer.image} 
                      alt={lawyer.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-medium">
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
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between w-full mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[180px]" 
                      title={displayName}>
                    {displayName}
                  </h3>
                </div>
                
                {hasVerificationFlag && (
                  <Badge variant="secondary" className="w-fit mb-2 flex items-center gap-1 bg-green-50 text-green-700">
                    <ShieldCheck className="h-3 w-3" />
                    {lawyer.pjud_verified ? 'Verificado en PJUD' : 'Verificado en PJUD'}
                  </Badge>
                )}
                
                <div className="flex items-center text-sm text-gray-600 space-x-2 w-full overflow-hidden mb-1">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span 
                    className="truncate block w-full max-w-[180px]" 
                    title={lawyer.location || 'Ubicación no disponible'}
                  >
                    {lawyer.location || 'Ubicación no disponible'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <button 
                    className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/lawyer/${lawyer.id}#reviews-section`);
                    }}
                  >
                    <Star className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />
                    <span className="font-medium">{currentRating.toFixed(1)}</span>
                    <span className="text-gray-400">({currentReviewCount})</span>
                  </button>
                  {/*<div className="h-4 w-px bg-gray-200 flex-shrink-0"></div>*/}
                  <span className="text-blue-600 font-medium">
                  {/*  {lawyer.cases ? lawyer.cases.toLocaleString() : '0'} casos */}
                  </span>
                </div>
              </div>
            </div>
          </div>
            
          <div className="absolute top-6 right-6">
            <Button
              variant="outline"
              size="sm"
              className={`${!isVerifiedLawyer ? 'opacity-50 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'} border-gray-300 h-9 px-4 font-medium shadow-sm hover:shadow transition-all duration-200 whitespace-nowrap bg-white`}
              onClick={(e) => {
                if (!isVerifiedLawyer) return;
                e.stopPropagation();
                const nameSlug = (lawyer.name || 'abogado')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '') // Remove accents
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '');
                navigate(`/abogado/${nameSlug}-${lawyer.id}`);
              }}
              disabled={!isVerifiedLawyer}
              title={!isVerifiedLawyer ? 'Este perfil no está completo o verificado' : 'Ver perfil completo'}
            >
              Ver perfil
            </Button>
          </div>

          {/* Contenido con alineación fija */}
          <div className="flex flex-col space-y-4 mt-auto">
            {/* Especialidades */}
            <div className="min-h-6">
              <div className="flex flex-wrap gap-2">
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
                    className="text-xs font-normal bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    {specialty}
                  </Badge>
                ))}
                {((Array.isArray(lawyer.specialties) ? lawyer.specialties.length : 0) > 3 || 
                 (typeof lawyer.specialties === 'string' && lawyer.specialties.split(',').length > 3)) && (
                  <span className="text-xs text-gray-500 self-center">+{Math.max(0, (Array.isArray(lawyer.specialties) ? lawyer.specialties.length : lawyer.specialties.split(',').length) - 3)} más</span>
                )}
              </div>
            </div>

            {/* Descripción */}
            <div className="max-w-full">
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

            {/* Precio y rating */}
            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  ${formatCLP(lawyer.hourlyRate)}
                </span>
                <span className="text-gray-500 text-sm ml-1">/hora</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción - Fijos en la parte inferior */}
        <div className="p-6 pt-0 mt-auto">
          <div className="flex space-x-2 w-full">
            <Button 
              variant="outline" 
              className={`flex-1 bg-white border-gray-300 ${
                buttonsDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={handleContactClick}
              disabled={buttonsDisabled}
              title={!isVerifiedLawyer ? 'Este abogado no está verificado o su perfil está incompleto' : ''}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {buttonsDisabled && !isOwnProfile ? 'No disponible' : 'Contactar'}
            </Button>
            <Button
              variant="default"
              className={`flex-1 bg-blue-600 ${
                buttonsDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-700'
              }`}
              onClick={handleScheduleClick}
              disabled={buttonsDisabled}
              title={!isVerifiedLawyer ? 'Este abogado no está verificado o su perfil está incompleto' : ''}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {buttonsDisabled && !isOwnProfile ? 'No disponible' : 'Agendar asesoría'}
            </Button>
          </div>
          {buttonsDisabled && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {isOwnProfile 
                ? 'No puedes contactar ni agendar contigo mismo' 
                : 'Este abogado no está verificado o su perfil está incompleto'}
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

      {/* Contact Modal */}
      <ContactModal
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        lawyerName={lawyer.name}
        lawyerId={lawyer.id}
        hasFreeConsultation={hasFreeConsultation}
        contactFeeClp={lawyer.contact_fee_clp || 0}
        service={{
          id: 'consultation',
          title: 'Consulta Legal',
          description: 'Consulta inicial con el abogado',
          price_clp: lawyer.contact_fee_clp || 0
        }}
      />

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
