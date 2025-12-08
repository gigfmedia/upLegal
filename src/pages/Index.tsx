import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Star, 
  MapPin, 
  Users, 
  Shield, 
  FileText, 
  Loader2, 
  Briefcase, 
  Building2, 
  ShieldCheck, 
  Home,
  MessageCircle,
  Calendar,
  Clock, 
  User,
  Scale,
  DollarSign,
  Lightbulb
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Lawyer } from "@/components/LawyerCard";
import { AuthModal } from "@/components/AuthModal";
import { ContactModal } from "@/components/ContactModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import { LawyerCard } from "@/components/LawyerCard";
import Header from "@/components/Header";
import { getVerifiedLawyersCount, subscribeToVerifiedLawyers } from "@/lib/verifiedLawyers";
import { getCompletedCasesCount, subscribeToCompletedCases } from "@/lib/caseServiceCounter";

const Index = () => {
  const { user, isLoading } = useAuth();
  
  // Debug: Log user object to verify structure
  useEffect(() => {
  }, [user]);
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [verifiedCount, setVerifiedCount] = useState<number | null>(null);
  const [completedCasesCount, setCompletedCasesCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState({
    verified: true,
    completed: true
  });
  // Estados para abogados destacados
  const [featuredLawyers, setFeaturedLawyers] = useState<Lawyer[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  
  // Estados para el abogado registrado
  const [registeredLawyer, setRegisteredLawyer] = useState<Lawyer | null>(null);
  const [isLoadingLawyer, setIsLoadingLawyer] = useState(true);

  // Check for login parameter in URL and open auth modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
      setShowAuthModal(true);
      setAuthMode('login');
      // Clean up URL without reloading the page
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Handle contact click
  const handleContactClick = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setShowContactModal(true);
  };

  // Handle schedule click
  const handleScheduleClick = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setShowScheduleModal(true);
  };



  // Fetch the registered lawyer data
  useEffect(() => {
    const fetchRegisteredLawyer = async () => {
      try {
        setIsLoadingLawyer(true);
        // Search for verified lawyers with empty query to get all
        const { searchLawyers } = await import('@/pages/api/search-lawyers');
        const { lawyers } = await searchLawyers({ page: 1, pageSize: 1 });
        
        if (lawyers && lawyers.length > 0) {
          const lawyer = lawyers[0];
          setRegisteredLawyer({
            id: lawyer.id || '',
            name: `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim(),
            specialties: lawyer.specialties || [],
            rating: lawyer.rating || 0,
            reviews: lawyer.review_count || 0,
            location: lawyer.location || 'Sin ubicación',
            cases: 0, // Default value
            hourlyRate: lawyer.hourly_rate_clp || 0,
            consultationPrice: lawyer.hourly_rate_clp ? Math.round(lawyer.hourly_rate_clp * 0.5) : 0,
            image: lawyer.avatar_url || '',
            bio: lawyer.bio || '',
            verified: lawyer.verified || false,
            availability: {
              availableToday: true,
              availableThisWeek: true,
              quickResponse: true,
              emergencyConsultations: true
            }
          });
        }
      } catch (error) {
        console.error('Error fetching registered lawyer:', error);
      } finally {
        setIsLoadingLawyer(false);
      }
    };

    fetchRegisteredLawyer();
  }, []);

  // Función para forzar la actualización del contador
  const refreshCounters = async () => {
    try {
      setIsLoadingCount(prev => ({ ...prev, verified: true }));
      // Limpiar la caché forzando una nueva consulta
      const { getVerifiedLawyersCount } = await import('@/lib/verifiedLawyers');
      const count = await getVerifiedLawyersCount();
      setVerifiedCount(count);
    } catch (error) {
      console.error('Error al actualizar el contador:', error);
    } finally {
      setIsLoadingCount(prev => ({ ...prev, verified: false }));
    }
  };

  // Efecto para cargar los contadores y suscribirse a cambios
  useEffect(() => {
    let isMounted = true;
    const unsubscribeFunctions: Array<() => void> = [];

    // Función para manejar la carga inicial
    const loadInitialCounts = async () => {
      try {
        // Mostrar carga mientras se obtienen los datos
        setIsLoadingCount({
          verified: true,
          completed: true
        });

        // Cargar ambos contadores en paralelo
        const [verifiedCount, completedCount] = await Promise.all([
          getVerifiedLawyersCount(),
          getCompletedCasesCount()
        ]);
        
        if (isMounted) {
          setVerifiedCount(verifiedCount);
          setCompletedCasesCount(completedCount);
        }
      } catch (error) {
        console.error('Error al cargar los contadores:', error);
        // Establecer valores por defecto en caso de error
        if (isMounted) {
          setVerifiedCount(0);
          setCompletedCasesCount(1000);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCount({
            verified: false,
            completed: false
          });
        }
      }
    };

    // Configurar las suscripciones
    const setupSubscriptions = () => {
      if (!isMounted) return;

      // Suscripción a cambios en abogados verificados
      const verifiedUnsubscribe = subscribeToVerifiedLawyers((count) => {
        if (isMounted) {
          setVerifiedCount(count);
        }
      });
      unsubscribeFunctions.push(verifiedUnsubscribe);

      // Suscripción a cambios en casos resueltos
      const casesUnsubscribe = subscribeToCompletedCases((count) => {
        if (isMounted) {
          setCompletedCasesCount(count);
        }
      });
      unsubscribeFunctions.push(casesUnsubscribe);
    };

    // Cargar datos iniciales
    loadInitialCounts();
    
    // Configurar suscripciones con un pequeño retraso para no bloquear la UI
    const subscriptionTimer = setTimeout(setupSubscriptions, 100);

    // Función de limpieza
    return () => {
      isMounted = false;
      clearTimeout(subscriptionTimer);
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error al cancelar suscripción:', error);
        }
      });
    };
  }, []);

  // Fetch featured lawyers
  useEffect(() => {
    const fetchFeaturedLawyers = async () => {
      try {
        setIsLoadingFeatured(true);
        const { searchLawyers } = await import('@/pages/api/search-lawyers');
        const { lawyers, total } = await searchLawyers({ page: 1, pageSize: 20 }); // Get more lawyers to ensure we have enough complete profiles
        
        if (lawyers && lawyers.length > 0) {
          // Get appointment counts for all lawyers (excluding pending payments)
          const lawyerIds = lawyers.map(l => l.id);
          const { data: appointmentCounts, error: countError } = await supabase
            .from('appointments')
            .select('lawyer_id, status')
            .in('lawyer_id', lawyerIds)
            .neq('status', 'pending_payment');
          
          // Create a map of lawyer_id to appointment count
          const countsMap = new Map<string, number>();
          if (appointmentCounts && !countError) {
            appointmentCounts.forEach(apt => {
              const count = countsMap.get(apt.lawyer_id) || 0;
              countsMap.set(apt.lawyer_id, count + 1);
            });
          }
          
          const formattedLawyers = lawyers
            .filter((lawyer: any) => {
              const firstName = lawyer.first_name?.toLowerCase() || '';
              const lastName = lawyer.last_name?.toLowerCase() || '';
              return !firstName.includes('admin') && !lastName.includes('admin');
            })
            .map(lawyer => ({
            id: lawyer.id || '',
            user_id: lawyer.user_id || '',
            name: `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim(),
            specialties: lawyer.specialties || [],
            rating: lawyer.rating || 0,
            reviews: lawyer.review_count || 0,
            location: lawyer.location || 'Sin ubicación',
            cases: countsMap.get(lawyer.id) || 0, // Get real appointment count
            hourlyRate: lawyer.hourly_rate_clp || 0,
            consultationPrice: lawyer.hourly_rate_clp ? Math.round(lawyer.hourly_rate_clp * 0.5) : 0,
            image: lawyer.avatar_url || '',
            bio: lawyer.bio || '',
            verified: lawyer.verified || false,
            availability: {
              availableToday: true,
              availableThisWeek: true,
              quickResponse: true,
              emergencyConsultations: true
            }
          }));
          
          // Sort lawyers with complete and verified profiles first, then by rating
          const sortedLawyers = [...formattedLawyers].sort((a, b) => {
            // First priority: Verified status
            if (a.verified && !b.verified) return -1;
            if (!a.verified && b.verified) return 1;
            
            // Second priority: Profile completeness
            const aIsComplete = a.bio?.trim() && 
                               a.specialties?.length > 0 && 
                               a.location?.trim() && 
                               a.hourlyRate > 0;
            
            const bIsComplete = b.bio?.trim() && 
                               b.specialties?.length > 0 && 
                               b.location?.trim() && 
                               b.hourlyRate > 0;
            
            if (aIsComplete && !bIsComplete) return -1;
            if (!aIsComplete && bIsComplete) return 1;
            
            // Third priority: Rating
            return (b.rating || 0) - (a.rating || 0);
          });
          
          // Take only the first 4 lawyers
          setFeaturedLawyers(sortedLawyers.slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching featured lawyers:', error);
      } finally {
        setIsLoadingFeatured(false);
      }
    };

    fetchFeaturedLawyers();
  }, []);

  // Categories for the slider
  const categories = [
    "Derecho Laboral",
    "Derecho de Familia",
    "Derecho Penal",
    "Derecho Civil",
    "Derecho Comercial",
    "Derecho Inmobiliario",
    "Derecho Tributario",
    "Derecho de Propiedad Intelectual",
    "Derecho de Extranjería"
  ] as const;

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

  const handleSearch = (category?: string) => {
    // If no search term, location, or category is provided, just navigate to /search
    if (!searchTerm && !location && !category) {
      navigate('/search');
      return;
    }

    // Otherwise, include the provided parameters
    const params = new URLSearchParams();
    
    // Check if search term contains specialty keywords
    const searchTermLower = searchTerm.toLowerCase();
    let detectedSpecialty = '';
    
    if (searchTermLower.includes('familia')) {
      detectedSpecialty = 'Derecho de Familia';
    } else if (searchTermLower.includes('laboral')) {
      detectedSpecialty = 'Derecho Laboral';
    } else if (searchTermLower.includes('penal')) {
      detectedSpecialty = 'Derecho Penal';
    } else if (searchTermLower.includes('civil')) {
      detectedSpecialty = 'Derecho Civil';
    } else if (searchTermLower.includes('comercial')) {
      detectedSpecialty = 'Derecho Comercial';
    } else if (searchTermLower.includes('inmobiliario')) {
      detectedSpecialty = 'Derecho Inmobiliario';
    } else if (searchTermLower.includes('tributario')) {
      detectedSpecialty = 'Derecho Tributario';
    }
    
    // Set search term parameter
    if (searchTerm) params.set('q', searchTerm);
    
    // Set location parameter
    if (location) params.set('location', location);
    
    // Set specialty parameter (either from detected keyword or category)
    if (detectedSpecialty) {
      params.set('specialty', detectedSpecialty);
      setSelectedCategory(detectedSpecialty);
    } else if (category) {
      params.set('category', category);
      setSelectedCategory(category);
    } else {
      setSelectedCategory(null);
    }
    
    navigate(`/search?${params.toString()}`);
  };
  
  // Effect to handle initial category from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, []);

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
            Conecta con abogados experimentados, recibe asesoría y resuelve tus asuntos legales
            con confianza. Servicios profesionales al alcance de tus manos.
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
              <Button size="lg" className="h-12 bg-blue-600 hover:bg-blue-700" onClick={() => handleSearch()}>
                <Search className="mr-2 h-5 w-5" />
                Buscar
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {isLoadingCount.verified ? (
                    <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse mx-auto"></div>
                  ) : (
                    <>{verifiedCount !== null ? `${verifiedCount}+` : '500+'}</>
                  )}
                </div>
              </div>
              <div className="text-gray-600">Abogados Verificados</div>
            </div>

            {/*<div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {isLoadingCount.completed ? (
                  <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div>
                ) : (
                  <>{completedCasesCount !== null ? `${completedCasesCount}+` : '10k+'}</>
                )}
              </div>
              <div className="text-gray-600">Casos Resueltos</div>
            </div>*/}
            {/* <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">4.8★</div>
              <div className="text-gray-600">Calificación Promedio</div>
            </div> */}
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
                  Todos los abogados están verificados en línea con el Poder Judicial.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg rounded-2xl">
              <CardHeader>
                <DollarSign className="h-12 w-12 text-blue-600 mx-auto mb-4" />
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

      {/* Categorías de Práctica */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <p className="text-left text-blue-600 mb-2">
            Directorio de Abogados
          </p>
          <h2 className="text-3xl font-bold text-left text-gray-900 mb-4">
            Busca abogados por área de práctica
          </h2>
          <p className="text-left text-gray-600 mb-12">
          Al buscar asesoría y representación, las personas a menudo buscan abogados que se especialicen en el área del derecho más adecuada para sus necesidades.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Derecho Laboral */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full"
              onClick={() => navigate('/search?specialty=Derecho+Laboral')}
            >
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Derecho Laboral</h3>
                <p className="text-sm text-gray-600">Tutela Laboral, Despidos Injustificados, Despido Indirecto, Nulidad del despido, Acoso Laboral, entre otros.</p>
              </CardContent>
            </Card>

            {/* Derecho de Familia */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full"
              onClick={() => navigate('/search?specialty=Derecho+de+Familia')}
            >
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Derecho de Familia</h3>
                <p className="text-sm text-gray-600">Divorcios, Relación Directa y Regular, Filiación, Alimentos, Cuidado Personal, Medidas de Protección, Violencia Intrafamiliar, Autorización para salir del país, Adopción, Cumplimiento de Alimentos, entre otros.</p>
              </CardContent>
            </Card>

            {/* Derecho Civil */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full"
              onClick={() => navigate('/search?specialty=Derecho+Civil')}
            >
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Scale className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Derecho Civil</h3>
                <p className="text-sm text-gray-600">Nulidad de Contrato, Incumplimiento de contrato, Indemnización de Perjuicios, Juicio Ejecutivo, Juicio de Arrendamiento, Juicio de Precario, Cambio de Nombre, Interdicción, entre otros.</p>
              </CardContent>
            </Card>

            {/* Derecho Penal */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full"
              onClick={() => navigate('/search?specialty=Derecho+Penal')}
            >
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Derecho Penal</h3>
                <p className="text-sm text-gray-600">Defensa penal en detenciones, formalizaciones y audiencias; representación de víctimas y presentación de querellas; asesoría en casos de delitos comunes; orientación frente a citaciones e investigaciones de Fiscalía; y gestión  salidas alternativas como acuerdos reparatorios o suspensiones condicionales, entre otros.</p>
              </CardContent>
            </Card>

            {/* Derecho Comercial */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full"
              onClick={() => navigate('/search?specialty=Derecho+Comercial')}
            >
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Derecho Comercial</h3>
                <p className="text-sm text-gray-600">Constitución de Sociedades, Modificación de Sociedades, Asesoramiento de empresas, Procedimiento de Reliquidación de Personas, entre otros.</p>
              </CardContent>
            </Card>

            {/* Derecho de Seguros */}
            {/* <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full"
              onClick={() => navigate('/search?category=seguros')}
            >
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Derecho de Seguros</h3>
                <p className="text-sm text-gray-600">Reclamos a aseguradoras, siniestros, coberturas, etc.</p>
              </CardContent>
            </Card> */}

            {/* Derecho Inmobiliario */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full"
              onClick={() => navigate('/search?specialty=Derecho+de+Propiedad+Intelectual')}
            >
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Lightbulb className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Propiedad intelectual</h3>
                <p className="text-sm text-gray-600">Registro de marcas comerciales ante INAPI, renovación y vigilancia de marcas, oposiciones y defensas en procedimientos administrativos, asesoría en derechos de autor, protección de nombres comerciales y logotipos, entre otros.</p>
              </CardContent>
            </Card>

            {/* Ver todas las especialidades */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full border-2 border-dashed border-gray-300 hover:border-blue-500"
              onClick={() => navigate('/search')}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-center">Ver todas las especialidades</h3>
                <p className="text-sm text-gray-600 text-center">Explora todas nuestras categorías de práctica legal.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Lista de Abogados */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Abogados destacados
            </h2>
            <Button variant="outline" onClick={() => navigate('/search')}>
              Ver todos
            </Button>
          </div>
          
          {isLoadingFeatured ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex space-x-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-6 w-20 rounded-full" />
                      ))}
                    </div>
                    <div className="mt-6 flex flex-col space-y-2">
                      <Skeleton className="h-10 w-full rounded-md" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredLawyers.map((lawyer) => (
                <LawyerCard
                  key={lawyer.id}
                  lawyer={lawyer}
                  onContactClick={() => {
                    if (!user) {
                      setAuthMode('login');
                      setShowAuthModal(true);
                      return;
                    }
                    handleContactClick(lawyer);
                  }}
                  onScheduleClick={() => {
                    if (!user) {
                      setAuthMode('login');
                      setShowAuthModal(true);
                      return;
                    }
                    handleScheduleClick(lawyer);
                  }}
                  user={user}
                />
              ))}
              
              {/* Mock lawyers removed to show only real data */}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Eres Abogado?
          </h2>
          <p className="text-xl mb-8 text-white">
            Únete a nuestra plataforma y conecta con clientes que buscan tu experiencia.
            Impulsa el crecimiento de tu estudio y potencia tu carrera.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => handleAuthClick('signup', 'lawyer')}
            className={`bg-white text-blue-600 hover:bg-gray-100 ${user?.user_metadata?.role === 'lawyer' ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={user?.user_metadata?.role === 'lawyer'}
          >
            {user?.user_metadata?.role === 'lawyer' ? 'Ya eres Abogado' : 'Comenzar como Abogado'}
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
            lawyerId={selectedLawyer.id}
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
