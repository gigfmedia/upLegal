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
  return amount.toLocaleString("es-CL");
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
          <div className="flex justify-between items-start mb-4">
            <div className="flex space-x-4">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarImage src={lawyer.image} alt={lawyer.name} />
                <AvatarFallback>
                  {lawyer.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold">
                    {lawyer.name}
                  </h3>
                  {lawyer.verified && (
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-600 space-x-2">
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
            
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-8 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/lawyer/${lawyer.id}`);
              }}
            >
              Ver perfil
            </Button>
          </div>

          {/* Contenido con alineación fija */}
          <div className="flex flex-col space-y-4 mt-auto">
            {/* Especialidades */}
            <div className="h-6">
              <div className="flex flex-wrap gap-2">
                {lawyer.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sección media - Resumen */}
            {lawyer.bio && (
              <p className="text-sm text-gray-600 line-clamp-3">
                {lawyer.bio}
              </p>
            )}

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
        <div className="p-4 pt-0">
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
