import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Lawyer } from "@/components/LawyerCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  ArrowLeft, 
  Filter, 
  SlidersHorizontal,
  MapPin,
  Star,
  Users,
  DollarSign
} from "lucide-react";
import { LawyerCard } from "@/components/LawyerCard";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { ContactModal } from "@/components/ContactModal";
import { ScheduleModal } from "@/components/ScheduleModal";

const SearchResults = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Get search parameters from URL
  const initialQuery = searchParams.get('q') || '';
  const initialSpecialty = searchParams.get('specialty') || 'all';
  const initialLocation = searchParams.get('location') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [location, setLocation] = useState(initialLocation);
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  // Mock data - same as Index page
  const mockLawyers: Lawyer[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      specialties: ["Corporate Law", "Business Law"],
      rating: 4.9,
      reviews: 127,
      location: "New York, NY",
      hourlyRate: 350000,
      consultationPrice: 35000,
      image: "",
      bio: "Expert in corporate law with 15+ years of experience helping businesses navigate complex legal challenges.",
      verified: false
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
      image: "/placeholder.svg",
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

  // Map of Spanish to English specialty translations
  const specialtyTranslations: Record<string, string> = {
    'Derecho Corporativo': 'Corporate Law',
    'Defensa Penal': 'Criminal Defense',
    'Derecho Migratorio': 'Immigration Law',
    'Derecho de Familia': 'Family Law',
    'Accidentes y Lesiones': 'Personal Injury',
    'Derecho Inmobiliario': 'Real Estate Law',
    'Derecho Laboral': 'Employment Law',
    'Propiedad Intelectual': 'Intellectual Property',
    'Planificación Patrimonial': 'Estate Planning',
    'Derecho Tributario': 'Tax Law',
    'Negligencia Médica': 'Medical Malpractice',
    'Derecho de Patentes': 'Patent Law',
    'Defensa DUI': 'DUI Defense',
    'Divorcio': 'Divorce',
    'Business Law': 'Business Law',
    'Corporate Law': 'Corporate Law',
    'Criminal Defense': 'Criminal Defense',
    'Immigration Law': 'Immigration Law',
    'Family Law': 'Family Law',
    'Personal Injury': 'Personal Injury',
    'Real Estate Law': 'Real Estate Law',
    'Employment Law': 'Employment Law',
    'Intellectual Property': 'Intellectual Property',
    'Estate Planning': 'Estate Planning',
    'Tax Law': 'Tax Law',
    'Medical Malpractice': 'Medical Malpractice',
    'Patent Law': 'Patent Law',
    'DUI Defense': 'DUI Defense',
    'Divorce': 'Divorce'
  };

  // Filter and sort lawyers
  const filteredLawyers = mockLawyers
    .filter(lawyer => {
      const matchesSearch = searchTerm === '' || 
        lawyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lawyer.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSpecialty = selectedSpecialty === "all" || 
        lawyer.specialties.some(specialty => {
          // Check if the lawyer's specialty matches the selected one (in any language)
          const translatedSpecialty = specialtyTranslations[selectedSpecialty];
          return specialty === selectedSpecialty || 
                 specialty === translatedSpecialty ||
                 specialtyTranslations[specialty] === selectedSpecialty;
        });
      
      const matchesLocation = location === '' ||
        lawyer.location.toLowerCase().includes(location.toLowerCase());
      
      return matchesSearch && matchesSpecialty && matchesLocation;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'price_low':
          return a.hourlyRate - b.hourlyRate;
        case 'price_high':
          return b.hourlyRate - a.hourlyRate;
        case 'reviews':
          return b.reviews - a.reviews;
        default:
          return 0;
      }
    });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedSpecialty !== 'all') params.set('specialty', selectedSpecialty);
    if (location) params.set('location', location);
    setSearchParams(params);
  };

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedSpecialty !== 'all') params.set('specialty', selectedSpecialty);
    if (location) params.set('location', location);
    setSearchParams(params, { replace: true });
  }, [searchTerm, selectedSpecialty, location, setSearchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAuthClick={handleAuthClick} />
      
      {/* Search Header - Fixed height */}
      <div className="bg-white border-b sticky top-16 z-40 h-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full flex flex-col justify-center">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Buscar abogados o especialidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las Especialidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Especialidades</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Ubicación"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {/* Results Content - Adjusted top padding for fixed header */}
      <div className="mt-8 pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {filteredLawyers.length} Abogados encontrados
                {(searchTerm || selectedSpecialty !== 'all' || location) && (
                  <span className="text-gray-600 font-normal">
                    {' '}para "{searchTerm || selectedSpecialty || location}"
                  </span>
                )}
              </h1>
              {(searchTerm || selectedSpecialty !== 'all' || location) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {searchTerm && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchTerm('')}>
                      Query: {searchTerm} ×
                    </Badge>
                  )}
                  {selectedSpecialty !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedSpecialty('all')}>
                      {selectedSpecialty} ×
                    </Badge>
                  )}
                  {location && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setLocation('')}>
                      {location} ×
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Más valorados</SelectItem>
                  <SelectItem value="price_low">Precio: más bajo a más alto</SelectItem>
                  <SelectItem value="price_high">Precio: más alto a mas bajo</SelectItem>
                  <SelectItem value="reviews">Con mayor reseñas</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rango de precio
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Input placeholder="Min" type="number" className="w-24" />
                        <span>-</span>
                        <Input placeholder="Max" type="number" className="w-24" />
                        <span className="text-sm text-gray-500"> / hora</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating
                    </label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Ratings</SelectItem>
                        <SelectItem value="4.5">4.5+ Estrellas</SelectItem>
                        <SelectItem value="4.0">4.0+ Estrellas</SelectItem>
                        <SelectItem value="3.5">3.5+ Estrellas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experiencia
                    </label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los niveles de experiencia</SelectItem>
                        <SelectItem value="20">20+ Años</SelectItem>
                        <SelectItem value="15">15+ Años</SelectItem>
                        <SelectItem value="10">10+ Años</SelectItem>
                        <SelectItem value="5">5+ Años</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Grid */}
          {filteredLawyers.length > 0 ? (
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
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron abogados</h3>
                <p className="text-gray-600 mb-4">
                  Intenta ajustar los criterios de búsqueda o busca todos los abogados.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedSpecialty("all");
                    setLocation("");
                  }}
                >
                  Borrar todos los filtros
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

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

export default SearchResults;
