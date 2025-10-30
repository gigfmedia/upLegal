import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, CheckCircle, MessageCircle, Calendar, User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConsultationModal } from "./ConsultationModal";
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
  user_id?: string; // Add this line
  name: string;
  specialties: string[];
  rating: number;
  reviews: number;
  location: string;
  cases: number;
  hourlyRate: number;
  consultationPrice: number;
  image: string;
  bio: string;
  verified: boolean;
  availability: {
    availableToday: boolean;
    availableThisWeek: boolean;
    quickResponse: boolean;
    emergencyConsultations: boolean;
  };
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
  // Check if the current user is the owner of this lawyer profile
  const isOwnProfile = Boolean(
    user?.id && 
    (user.id === lawyer.user_id || user.id === lawyer.id)
  );
  
  // Debug logs - only log if we have a user to reduce noise
  if (user?.id) {
    console.debug('LawyerCard - User ID:', user.id);
    console.debug('LawyerCard - Lawyer ID:', lawyer.id, 'User ID:', lawyer.user_id);
    console.debug('isOwnProfile:', isOwnProfile, 'User matches lawyer.user_id:', user.id === lawyer.user_id, 'User matches lawyer.id:', user.id === lawyer.id);
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

  // Debug log for bio
  //console.log('LawyerCard - Bio:', lawyer.id, lawyer.name, 'Bio:', lawyer.bio);
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md flex flex-col h-full">
        <div className="flex-1 flex flex-col p-6">
          {/* Sección superior - Info básica */}
          <div className="flex justify-between items-start mb-4 w-full">
            <div className="flex space-x-4">
              <div className="relative">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={lawyer.image} 
                      alt={lawyer.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-medium">
                      {lawyer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex justify-between items-start w-full">
                      <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[180px]" title={lawyer.name}>
                        {lawyer.name}
                      </h3>
                      {/* Favorite button removed as per request */}
                    </div>
                    {lawyer.verified && (
                      <Badge variant="secondary" className="w-fit mt-1 flex items-center gap-1 bg-green-50 text-green-700">
                        <ShieldCheck className="h-3 w-3" />
                        Verificado en PJUD
                      </Badge>
                    )}
                  </div>
                </div> {/* Close flex-col div */}
                
                <div className="mt-1 w-full">
                  <div className="flex items-center text-sm text-gray-600 space-x-2 w-full overflow-hidden">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span 
                      className="truncate block w-full max-w-[180px]" 
                      title={lawyer.location || 'Ubicación no disponible'}
                    >
                      {lawyer.location || 'Ubicación no disponible'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm mt-1">
                    <button 
                      className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRatingsDialog(true);
                      }}
                    >
                      <Star className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />
                      <span className="font-medium">{currentRating.toFixed(1)}</span>
                      <span className="text-gray-400">({currentReviewCount})</span>
                    </button>
                    <div className="h-4 w-px bg-gray-200 flex-shrink-0"></div>
                    <span className="text-blue-600 font-medium">
                      {lawyer.cases ? lawyer.cases.toLocaleString() : '0'} casos
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 ml-2 z-10">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-8 px-4 py-1.5 font-medium shadow-sm hover:shadow transition-all duration-200 whitespace-nowrap bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/lawyer/${lawyer.id}`);
                }}
              >
                Ver perfil
              </Button>
            </div>
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
                .map((specialty, index) => (
                  <Badge key={`${specialty}-${index}`} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sección media - Resumen */}
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
                <p className="text-gray-500 italic text-sm" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineClamp: 2,
                  maxHeight: '2.8em',
                  lineHeight: '1.4em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  Este abogado no ha proporcionado una biografía.
                </p>
              )}
            </div>

            {/* Precio */}
            <div className="h-8 flex items-center">
              <span className="text-2xl font-bold text-gray-900">
                ${formatCLP(lawyer.hourlyRate)}
              </span>
              <span className="text-gray-500 text-sm ml-1">/hora</span>
            </div>
          </div>
        </div>

        {/* Botones de acción - Fijos en la parte inferior */}
        <div className="p-6 pt-0">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className={`flex-1 bg-white border-gray-300 ${
                isOwnProfile 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={handleContactClick}
              disabled={isOwnProfile}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {isOwnProfile ? 'No disponible' : 'Contactar'}
            </Button>
            <Button
              variant="default"
              className={`flex-1 bg-blue-600 ${
                isOwnProfile 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-700'
              }`}
              onClick={handleScheduleClick}
              disabled={isOwnProfile}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isOwnProfile ? 'No disponible' : 'Agendar'}
            </Button>
          </div>
          {isOwnProfile && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              No puedes contactar o agendar contigo mismo
            </p>
          )}
        </div>
      </Card>

      {/* Ratings Dialog */}
      <Dialog open={showRatingsDialog} onOpenChange={setShowRatingsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="ratings-dialog-description">
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

      {/* Consultation Modal */}
      <ConsultationModal
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        lawyer={lawyer}
        hasFreeConsultation={hasFreeConsultation}
        consultationPrice={lawyer.consultationPrice}
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
