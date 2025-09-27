import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, CheckCircle, MessageCircle, Calendar, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConsultationModal } from "./ConsultationModal";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";

export interface Lawyer {
  id: string;
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
  onSchedule 
}: LawyerCardProps) {
  // For backward compatibility, use the new props if provided, fall back to old ones
  const handleContact = onContactClick || onContact || (() => {});
  const handleSchedule = onScheduleClick || onSchedule || (() => {});
  
  const { user } = useAuth();
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Check if user has already used their free consultation
  const hasUsedFreeConsultation = user?.user_metadata?.hasUsedFreeConsultation || false;
  const hasFreeConsultation = !!user && !hasUsedFreeConsultation;

  const navigate = useNavigate();

  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    setIsConsultationOpen(true);
    if (onContactClick) {
      onContactClick();
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md flex flex-col h-full">
        <div className="flex-1 flex flex-col p-6">
          {/* Sección superior - Info básica */}
          <div className="flex justify-between items-start mb-4 w-full">
            <div className="flex space-x-4">
              <div className="relative h-16 w-16 flex-shrink-0">
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  {lawyer.image ? (
                    <div 
                      className="w-full h-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${lawyer.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center',
                        backgroundRepeat: 'no-repeat',
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <img 
                        src={lawyer.image} 
                        alt={lawyer.name}
                        className="opacity-0 w-full h-full"
                        onError={(e) => {
                          console.error('Error loading avatar image:', e);
                          // @ts-ignore - TypeScript doesn't know about currentTarget for some reason
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-700 text-xl font-medium">
                      {lawyer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold">
                    {lawyer.name}
                  </h3>
                  {lawyer.verified && (
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
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
            <div className="prose max-w-none">
              {lawyer.bio && lawyer.bio.trim() !== '' ? (
                <div className="whitespace-pre-line text-gray-700 text-sm line-clamp-3">
                  {lawyer.bio}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">
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
              className="flex-1 bg-white hover:bg-gray-50 border-gray-300"
              onClick={handleContactClick}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contactar
            </Button>
            <Button
              onClick={onSchedule}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </Button>
          </div>
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
