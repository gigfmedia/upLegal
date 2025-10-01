import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, MapPin, Users, Shield, Scale, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Lawyer } from "@/components/LawyerCard";
import { AuthModal } from "@/components/AuthModal";
import { ContactModal } from "@/components/ContactModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import { LawyerCard } from "@/components/LawyerCard";
import Header from "@/components/Header";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  // Expanded mock data for lawyers
  const mockLawyers: Lawyer[] = [
    {
      id: "7",
      name: "Gabriela Gómez",
      specialties: ["Derecho Laboral", "Derecho de Familia"],
      rating: 4.9,
      reviews: 142,
      location: "Santiago, Chile",
      hourlyRate: 350000,
      consultationPrice: 40000,
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1588&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      bio: "Abogada especializada en derecho laboral y de familia con más de 10 años de experiencia. Comprometida con la defensa de los derechos de los trabajadores y las familias chilenas.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: true,
        emergencyConsultations: true
      }
    },
    {
      id: "1",
      name: "Sarah Johnson",
      specialties: ["Corporate Law", "Business Law"],
      rating: 4.9,
      reviews: 127,
      location: "New York, NY",
      hourlyRate: 50000,
      consultationPrice: 35000,
      image: "",
      bio: "Expert in corporate law with 15+ years of experience helping businesses navigate complex legal challenges.",
      verified: true
    },
    {
      id: "2",
      name: "Michael Chen",
      specialties: ["Criminal Defense", "Personal Injury"],
      rating: 4.8,
      reviews: 89,
      location: "Los Angeles, CA",
      hourlyRate: 275000,
      consultationPrice: 40000,
      image: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      bio: "Dedicated criminal defense attorney with a track record of successful case outcomes.",
      verified: true
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      specialties: ["Immigration Law", "Family Law"],
      rating: 4.7,
      reviews: 156,
      location: "Miami, FL",
      hourlyRate: 225000,
      consultationPrice: 30000,
      image: "/placeholder.svg",
      bio: "Compassionate immigration and family law attorney serving diverse communities.",
      verified: true
    },
    {
      id: "4",
      name: "David Thompson",
      specialties: ["Real Estate Law", "Corporate Law"],
      rating: 4.9,
      reviews: 203,
      location: "Chicago, IL",
      hourlyRate: 400000,
      consultationPrice: 45000,
      image: "/placeholder.svg",
      bio: "Specializing in commercial real estate transactions and corporate acquisitions with 20+ years experience.",
      verified: true
    },
    {
      id: "5",
      name: "Lisa Park",
      specialties: ["Employment Law", "Intellectual Property"],
      rating: 4.6,
      reviews: 78,
      location: "San Francisco, CA",
      hourlyRate: 320000,
      consultationPrice: 38000,
      image: "/placeholder.svg",
      bio: "Tech-focused attorney helping startups and employees navigate workplace and IP matters.",
      verified: true
    },
    {
      id: "6",
      name: "Robert Martinez",
      specialties: ["Personal Injury", "Medical Malpractice"],
      rating: 4.8,
      reviews: 145,
      location: "Houston, TX",
      hourlyRate: 300000,
      consultationPrice: 35000,
      image: "/placeholder.svg",
      bio: "Aggressive advocate for injury victims with a proven track record of substantial settlements.",
      verified: true
    },
    {
      id: "7",
      name: "Jennifer Liu",
      specialties: ["Family Law", "Divorce"],
      rating: 4.7,
      reviews: 112,
      location: "Seattle, WA",
      hourlyRate: 250000,
      consultationPrice: 30000,
      image: "/placeholder.svg",
      bio: "Compassionate family law attorney helping clients through difficult transitions with dignity.",
      verified: true
    },
    {
      id: "8",
      name: "Thomas Anderson",
      specialties: ["Criminal Defense", "DUI Defense"],
      rating: 4.9,
      reviews: 167,
      location: "Phoenix, AZ",
      hourlyRate: 285000,
      consultationPrice: 35000,
      image: "/placeholder.svg",
      bio: "Former prosecutor turned defense attorney with insider knowledge of the criminal justice system.",
      verified: true
    },
    {
      id: "9",
      name: "Amanda Foster",
      specialties: ["Estate Planning", "Tax Law"],
      rating: 4.8,
      reviews: 94,
      location: "Boston, MA",
      hourlyRate: 375000,
      consultationPrice: 45000,
      image: "/placeholder.svg",
      bio: "Helping families protect their wealth and plan for the future with comprehensive estate strategies.",
      verified: true
    },
    {
      id: "10",
      name: "Carlos Mendez",
      specialties: ["Immigration Law", "Deportation Defense"],
      rating: 4.6,
      reviews: 134,
      location: "Austin, TX",
      hourlyRate: 200000,
      consultationPrice: 25000,
      image: "/placeholder.svg",
      bio: "Bilingual attorney dedicated to keeping families together and achieving the American dream.",
      verified: true
    },
    {
      id: "11",
      name: "Dr. Rachel Green",
      specialties: ["Medical Malpractice", "Personal Injury"],
      rating: 4.9,
      reviews: 89,
      location: "Denver, CO",
      hourlyRate: 425000,
      consultationPrice: 50000,
      image: "/placeholder.svg",
      bio: "Former medical professional turned attorney, uniquely qualified to handle complex medical cases.",
      verified: true
    },
    {
      id: "12",
      name: "Kevin O'Brien",
      specialties: ["Intellectual Property", "Patent Law"],
      rating: 4.7,
      reviews: 76,
      location: "Portland, OR",
      hourlyRate: 450000,
      consultationPrice: 55000,
      image: "/placeholder.svg",
      bio: "Engineering background with expertise in protecting innovations and intellectual property rights.",
      verified: true
    }
  ];

  const specialties = [
    "Derecho Corporativo",
    "Defensa Penal", 
    "Derecho Migratorio",
    "Derecho de Familia",
    "Accidentes y Lesiones",
    "Derecho Inmobiliario",
    "Derecho Laboral",
    "Propiedad Intelectual",
    "Planificación Patrimonial",
    "Derecho Tributario",
    "Negligencia Médica",
    "Derecho de Patentes",
    "Defensa DUI",
    "Divorcio"
  ];

  // Get Gabriela Gómez separately to ensure she's always included
  const gabrielaGomez = mockLawyers.find(lawyer => lawyer.id === "7");
  
  // Filter other lawyers based on search criteria
  const otherFilteredLawyers = mockLawyers.filter(lawyer => {
    // Skip Gabriela Gómez as we'll add her separately
    if (lawyer.id === "7") return false;
    
    const matchesSearch = searchTerm === "" || 
                         lawyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lawyer.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = !location || 
                          (lawyer.location && lawyer.location.toLowerCase().includes(location.toLowerCase()));
    return matchesSearch && matchesLocation;
  });
  
  // Combine Gabriela Gómez with other filtered lawyers, ensuring no duplicates
  const filteredLawyers = [
    ...(gabrielaGomez ? [gabrielaGomez] : []),
    ...otherFilteredLawyers
  ].slice(0, 6); // Limit to 6 lawyers total

  const handleAuthClick = (mode: 'login' | 'signup', role: 'client' | 'lawyer' = 'client') => {
    setAuthMode(mode);
    // If signing up as a lawyer, we'll set the role in the AuthModal
    if (mode === 'signup' && role === 'lawyer') {
      // We'll use a small timeout to ensure the modal is open before setting the role
      setTimeout(() => {
        const lawyerRadio = document.querySelector('input[value="lawyer"]') as HTMLInputElement;
        const lawyerLabel = lawyerRadio?.closest('label');
        if (lawyerRadio && lawyerLabel) {
          // Uncheck client radio if it's checked
          const clientRadio = document.querySelector('input[value="client"]') as HTMLInputElement;
          const clientLabel = clientRadio?.closest('label');
          
          if (clientRadio && clientLabel) {
            clientRadio.checked = false;
            clientLabel.classList.remove('border-blue-500', 'bg-blue-50');
            clientLabel.classList.add('border-gray-200', 'hover:border-gray-300', 'hover:bg-gray-50');
          }
          
          // Set and style lawyer radio
          lawyerRadio.checked = true;
          lawyerLabel.classList.add('border-blue-500', 'bg-blue-50');
          lawyerLabel.classList.remove('border-gray-200', 'hover:border-gray-300', 'hover:bg-gray-50');
          
          // Trigger change event
          lawyerRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 100);
    }
    setShowAuthModal(true);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (location) params.set('location', location);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      
      <Header onAuthClick={handleAuthClick} />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 mt-8">
            Encuentra el 
            <span className="text-blue-600 underline-offset-8"> Abogado </span>
            ideal
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Conecta con abogados experimentados, recibe asesoría legal y resuelve tus asuntos 
            legales con confianza. Servicios legales profesionales al alcance de tus manos.
          </p>
          
          {/* Search Section */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar abogados o especialidades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Ubicación (opcional)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 h-12"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button size="lg" className="h-12 bg-blue-600 hover:bg-blue-700" onClick={handleSearch}>
                <Search className="mr-2 h-5 w-5" />
                Buscar
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">Abogados Verificados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">10k+</div>
              <div className="text-gray-600">Casos Resueltos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">4.8★</div>
              <div className="text-gray-600">Calificación Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Soporte</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ¿Por qué elegir nuestra plataforma?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg rounded-2xl">
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Profesionales Verificados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Todos los abogados están completamente verificados y cuentan con las licencias y credenciales apropiadas.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg rounded-2xl">
              <CardHeader>
                <Scale className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Precios Transparentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Precios claros y directos sin tarifas ocultas. Sabes exactamente lo que vas a pagar antes de comenzar.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg rounded-2xl">
              <CardHeader>
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Seguro y Confidencial</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Tus asuntos legales están protegidos con seguridad nivel bancario y secreto profesional abogado-cliente.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Lawyers Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Abogados destacados
            </h2>
            <Button variant="outline" onClick={() => navigate('/search')}>
              Ver todos
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLawyers.map((lawyer) => (
              <LawyerCard 
                key={lawyer.id} 
                lawyer={{
                  ...lawyer,
                  id: String(lawyer.id)
                }} 
                onContact={() => {
                  if (!user) {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  } else {
                    setSelectedLawyer(lawyer);
                    setShowContactModal(true);
                  }
                }}
                onSchedule={() => {
                  if (!user) {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  } else {
                    setSelectedLawyer(lawyer);
                    setShowScheduleModal(true);
                  }
                }}
              />
            ))}
          </div>

          {filteredLawyers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No se encontraron abogados que coincidan con tus criterios.</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setLocation("");
                }}
                className="mt-4"
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Eres Abogado? Únete a Nuestra Plataforma
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Unete a nuestra plataforma y conecta con clientes que necesitan tu experiencia.
            Haz crecer tu estudio y desarrolla tu carrera legal.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => handleAuthClick('signup', 'lawyer')}
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            Comenzar como Abogado
          </Button>
        </div>
      </section>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      {selectedLawyer && (
        <>
          <ContactModal
            isOpen={showContactModal}
            onClose={() => setShowContactModal(false)}
            lawyerName={selectedLawyer.name}
          />
          <ScheduleModal
            isOpen={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
            lawyerName={selectedLawyer.name}
            hourlyRate={selectedLawyer.hourlyRate}
            lawyerId={selectedLawyer.id || ""}
          />
        </>
      )}
    </div>
  );
};

export default Index;
