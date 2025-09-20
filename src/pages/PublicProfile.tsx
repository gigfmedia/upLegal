import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { ContactModal } from "@/components/ContactModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import { ServicesSection } from "@/components/ServicesSection";
import { AuthModal } from "@/components/AuthModal";
import { 
  Star, 
  MapPin, 
  CheckCircle, 
  MessageSquare, 
  Calendar,
  Trophy,
  Clock,
  ThumbsUp,
  Eye,
  ArrowLeft
} from "lucide-react";

interface PublicProfileProps {
  userData?: {
    id?: string;
    name: string;
    profile?: {
      rating: number;
      reviews: number;
      specialties: string[];
      hourlyRate: number;
      location: string;
      bio: string;
    };
    stats?: {
      profileViews: number;
    };
  };
}

const PublicProfile = ({ userData: propUser }: PublicProfileProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };
  
  const handleAuthModeChange = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
  };
  
  // Use props or location state or default data
  const defaultUserData = {
    id: 'default-id',
    name: "John Smith",
    profile: {
      rating: 4.9,
      reviews: 127,
      specialties: ["Corporate Law", "Contract Law", "Business Litigation"],
      hourlyRate: 350,
      location: "New York, NY",
      bio: "Experienced corporate attorney with over 10 years of experience helping businesses navigate complex legal challenges."
    },
    stats: {
      profileViews: 1247
    }
  };
  
  const userData = propUser || location.state?.userData || defaultUserData;

  const handleAuthRequired = (action: 'contact' | 'schedule') => {
    if (!currentUser) {
      setAuthMode('login');
      setShowAuthModal(true);
      return false;
    }
    // If user is logged in, open the appropriate modal
    if (action === 'contact') {
      setIsContactModalOpen(true);
    } else {
      setIsScheduleModalOpen(true);
    }
    return true;
  };

  // Mock data for the public profile view
  const publicProfile = {
    hourlyRate: userData.profile.hourlyRate,
    specialties: userData.profile.specialties,
    location: userData.profile.location,
    bio: userData.profile.bio,
    education: ["Harvard Law School - JD", "Yale University - BA Economics"],
    experience: [
      "Senior Partner at Goldman & Associates (2018-Present)",
      "Associate at Morrison Legal Group (2014-2018)",
      "Junior Associate at Sterling Law Firm (2012-2014)"
    ],
    certifications: ["New York State Bar", "Federal Court Admission", "Arbitration Certified"],
    languages: ["English (Native)", "Spanish (Fluent)", "French (Conversational)"],
    availability: "Disponible",
    responseTime: "< 2 horas",
    completionRate: "98%"
  };

  const recentWork = [
    {
      title: "Asesoría en Fusión Corporativa",
      description: "Asesoré exitosamente en una adquisición de $50M entre dos empresas tecnológicas.",
      date: "Completado hace 2 semanas",
      rating: 5
    },
    {
      title: "Consultoría en Derecho Laboral",
      description: "Proporcioné orientación integral en derecho laboral para empresa startup.",
      date: "Completado hace 1 mes", 
      rating: 5
    },
    {
      title: "Negociación de Contratos",
      description: "Negocié un acuerdo complejo de licenciamiento de software.",
      date: "Completado hace 2 meses",
      rating: 4
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center md:items-start">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src="/placeholder.svg" alt={userData.name} />
                      <AvatarFallback className="bg-blue-600 text-white text-2xl">
                        {userData.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Badge variant="default" className="mb-2">
                      {publicProfile.availability}
                    </Badge>
                    <Badge variant="secondary">
                      Abogado Mejor Calificado
                    </Badge>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold">{userData.name}</h2>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-500 mr-1" />
                        <span className="font-semibold">{userData.profile?.rating || 4.9}</span>
                        <span className="text-gray-600 ml-1">({userData.profile?.reviews || 127} reseñas)</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{publicProfile.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {publicProfile.specialties.map((specialty) => (
                        <Badge key={specialty} variant="outline">
                          {specialty}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Responde en {publicProfile.responseTime}</span>
                      </div>
                      <div className="flex items-center">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        <span>{publicProfile.completionRate} éxito en trabajos</span>
                      </div>
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        <span>{userData.stats?.profileViews} visualizaciones del perfil</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(publicProfile.hourlyRate * 800)} / hora
                    </div>
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          if (handleAuthRequired('schedule')) {
                            setIsScheduleModalOpen(true);
                          }
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Agendar
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          if (handleAuthRequired('contact')) {
                            setIsContactModalOpen(true);
                          }
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contactar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle>Acerca de</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {publicProfile.bio}
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Educación</h4>
                    <ul className="space-y-2">
                      {publicProfile.education.map((edu, index) => (
                        <li key={index} className="text-gray-600">{edu}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Certificaciones</h4>
                    <ul className="space-y-2">
                      {publicProfile.certifications.map((cert, index) => (
                        <li key={index} className="text-gray-600">{cert}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Experience Section */}
            <Card>
              <CardHeader>
                <CardTitle>Experiencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {publicProfile.experience.map((exp, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-4">
                      <p className="font-medium text-gray-900">{exp}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Work & Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Trabajos recientes y Comentarios de clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {recentWork.map((work, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{work.title}</h4>
                        <div className="flex items-center">
                          {[...Array(work.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">{work.description}</p>
                      <p className="text-sm text-gray-500">{work.date}</p>
                      {index < recentWork.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Services Section */}
            <ServicesSection />

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle>Idiomas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {publicProfile.languages.map((language) => (
                    <Badge key={language} variant="secondary">
                      {language}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      
      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        mode={authMode}
        onModeChange={handleAuthModeChange}
      />
    </div>

      {/* Modals */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        lawyerName={userData.name}
      />
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        lawyerName={userData.name}
        hourlyRate={publicProfile.hourlyRate}
        lawyerId={userData.id || ""}
      />
    </div>
  );
};

export default PublicProfile;
