import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, CheckCircle, MessageCircle, Calendar, User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConsultationModal } from "./ConsultationModal";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";

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
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
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
  console.log('LawyerCard - Bio:', lawyer.id, lawyer.name, 'Bio:', lawyer.bio);
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md flex flex-col h-full">
        <div className="flex-1 flex flex-col p-6">
          {/* Sección superior - Info básica */}
          <div className="flex justify-between items-start mb-4 w-full">
            <div className="flex space-x-4">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarImage 
                  src={lawyer.image} 
                  alt={lawyer.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-medium">
                  {lawyer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold">
                    {lawyer.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  {lawyer?.verified && (
                    <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Verificado</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-600 space-x-2 w-full max-w-[200px]">
                  <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{lawyer.location}</span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm whitespace-nowrap">
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Star className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />
                    <span className="font-medium">{lawyer.rating}</span>
                    <span className="text-gray-400">({lawyer.reviews})</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200 flex-shrink-0"></div>
                  <span className="text-blue-600 font-medium">
                    {lawyer.cases ? lawyer.cases.toLocaleString() : '0'} casos
                  </span>
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

      <ConsultationModal
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        lawyerName={lawyer.name}
        lawyerId={String(lawyer.id)}
        hasFreeConsultation={hasFreeConsultation}
        consultationPrice={lawyer.consultationPrice}
      />
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
  );
}
