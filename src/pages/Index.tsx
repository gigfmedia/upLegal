import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/SearchBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Users, 
  Shield, 
  FileText, 
  Briefcase, 
  Building2, 
  Scale,
  DollarSign,
  Lightbulb,
  ChevronDown,
  ChevronRight
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
  

  
  // Estado para FAQs
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Estado para placeholders rotativos con animación de escritura
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholderRef = useRef<HTMLInputElement | null>(null);

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
  
  // Typing animation effect for placeholders - optimized to not cause re-renders
  useEffect(() => {
    const placeholders = [
      "Despido injustificado…",
      "Pensión de alimentos…",
      "Divorcio…",
      "Deudas…",
      "Herencias…"
    ];
    
    const currentPlaceholder = placeholders[placeholderIndex];
    let currentIndex = 0;

    // Find the search input and update its placeholder directly
    const updatePlaceholder = (text: string) => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.placeholder = text;
      }
    };

    updatePlaceholder("");

    // Typing animation
    const typingInterval = setInterval(() => {
      if (currentIndex < currentPlaceholder.length) {
        updatePlaceholder(currentPlaceholder.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        
        // Wait before moving to next placeholder
        setTimeout(() => {
          setPlaceholderIndex((prevIndex) => (prevIndex + 1) % placeholders.length);
        }, 3000);
      }
    }, 60);

    return () => clearInterval(typingInterval);
  }, [placeholderIndex]);

  // Handle contact click - memoized to prevent re-renders
  const handleContactClick = useCallback((lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setShowContactModal(true);
  }, []);

  // Handle schedule click - memoized to prevent re-renders
  const handleScheduleClick = useCallback((lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setShowScheduleModal(true);
  }, []);





  // Efecto para cargar los contadores (sin suscripciones en tiempo real para mejor performance)
  useEffect(() => {
    const loadInitialCounts = async () => {
      try {
        setIsLoadingCount({
          verified: true,
          completed: true
        });

        // Cargar ambos contadores en paralelo
        const [verifiedCount, completedCount] = await Promise.all([
          getVerifiedLawyersCount(),
          getCompletedCasesCount()
        ]);
        
        setVerifiedCount(verifiedCount);
        setCompletedCasesCount(completedCount);
      } catch (error) {
        console.error('Error al cargar los contadores:', error);
        // Establecer valores por defecto en caso de error
        setVerifiedCount(0);
        setCompletedCasesCount(1000);
      } finally {
        setIsLoadingCount({
          verified: false,
          completed: false
        });
      }
    };

    loadInitialCounts();
  }, []);

  // Fetch featured lawyers
  useEffect(() => {
    const fetchFeaturedLawyers = async () => {
      try {
        setIsLoadingFeatured(true);
        const { searchLawyers } = await import('@/pages/api/search-lawyers');
        const { lawyers } = await searchLawyers({ page: 1, pageSize: 9 }); // Only fetch what we display
        
        if (lawyers && lawyers.length > 0) {
          const formattedLawyers = lawyers
            .filter((lawyer: any) => {
              const firstName = lawyer.first_name?.toLowerCase() || '';
              const lastName = lawyer.last_name?.toLowerCase() || '';
              
              // Skip admin accounts
              if (firstName.includes('admin') || lastName.includes('admin')) {
                return false;
              }
              
              // Check if profile is complete and verified
              const isProfileComplete = 
                lawyer.verified && 
                lawyer.bio?.trim() && 
                lawyer.specialties?.length > 0 && 
                lawyer.location?.trim() && 
                lawyer.hourly_rate_clp > 0;
              
              return isProfileComplete;
            })
            .map(lawyer => ({
            id: lawyer.id || '',
            user_id: lawyer.user_id || '',
            name: `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim(),
            specialties: lawyer.specialties || [],
            rating: lawyer.rating || 0,
            reviews: lawyer.review_count || 0,
            location: lawyer.location || 'Sin ubicación',
            cases: 0, // Simplified - not fetching appointment counts for performance
            hourlyRate: lawyer.hourly_rate_clp || 0,
            consultationPrice: lawyer.hourly_rate_clp ? Math.round(lawyer.hourly_rate_clp * 0.5) : 0,
            image: lawyer.avatar_url || '',
            bio: lawyer.bio || '',
            verified: lawyer.verified || false,
            created_at: lawyer.created_at,
            availability: {
              availableToday: true,
              availableThisWeek: true,
              quickResponse: true,
              emergencyConsultations: true
            }
          }));
          
          // Sort lawyers by creation date (newest first)
          const sortedLawyers = [...formattedLawyers].sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          });
          
          setFeaturedLawyers(sortedLawyers);
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

  // Add a ref to track if a search is in progress
  const isSearching = useRef(false);
  
  const handleSearch = useCallback((category?: string) => {
    // Prevent multiple rapid searches
    if (isSearching.current) return;
    
    try {
      isSearching.current = true;
      
      // If both search term and location are empty, show all lawyers
      if (!searchTerm.trim() && !location.trim()) {
        navigate('/search');
        return;
      }

      const params = new URLSearchParams();
      
      // Set search term parameter if it exists and is not empty
      if (searchTerm && searchTerm.trim()) {
        const searchTermValue = searchTerm.trim();
        params.set('q', searchTermValue);
        
        // Check if search term contains specialty keywords
        const searchTermLower = searchTermValue.toLowerCase();
        if (searchTermLower.includes('familia')) {
          params.set('specialty', 'Derecho de Familia');
        } else if (searchTermLower.includes('laboral')) {
          params.set('specialty', 'Derecho Laboral');
        } else if (searchTermLower.includes('penal')) {
          params.set('specialty', 'Derecho Penal');
        } else if (searchTermLower.includes('civil')) {
          params.set('specialty', 'Derecho Civil');
        } else if (searchTermLower.includes('comercial')) {
          params.set('specialty', 'Derecho Comercial');
        } else if (searchTermLower.includes('inmobiliario')) {
          params.set('specialty', 'Derecho Inmobiliario');
        } else if (searchTermLower.includes('tributario')) {
          params.set('specialty', 'Derecho Tributario');
        }
      }
      
      // Set location parameter if it exists and is not empty
      if (location && location.trim()) {
        params.set('location', location.trim());
      }
      
      // Navigate to search with the constructed parameters
      navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`);
    } finally {
      // Reset the flag after a short delay to prevent rapid searches
      setTimeout(() => {
        isSearching.current = false;
      }, 1000);
    }
  }, [navigate, searchTerm, location]); // Added dependency array
  
  // Effect to handle initial category from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-t from-blue-400 to-indigo-600">
      
      <Header onAuthClick={handleAuthClick} />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="border border-white rounded-full p-1 text-sm text-white mb-8 max-w-3xl mx-auto w-fit px-2 mt-4">Abogados verificados en todo Chile</p>
          <h1 className="text-3xl sm:text-5xl leading-[1.4] sm:leading-[1.2] font-bold text-white mb-8 mt-8">
            Asesoría legal online con&nbsp;
            <span className="text-white underline underline-offset-8">Abogados verificados.</span> 
            <br />Rápido, seguro y sin complicaciones.
          </h1>
          <p className="text-m sm:text-xl text-white mb-12 max-w-3xl mx-auto">
            Conecta con un abogado experto según tu caso.<br /> Videollamada, precios claros y disponibilidad inmediata.
          </p>
          {/* Search Section */}
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-6 mb-12">
            <SearchBar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              location={location}
              onLocationChange={setLocation}
              onSearch={handleSearch}
              onFiltersClick={() => {}}
              showMobileFilters={false}
              buttonWidth="1/3"
              className="h-10"
              placeholder="Despido injustificado..."
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8 max-w-3xl mx-auto mt-24">
            <div className="text-center">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-white mb-2">
                  +10
                </div>
              </div>
              <div className="text-white">Áreas legales disponibles</div>
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
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-white">Soporte disponible</div>
            </div>
          </div>
          <p className="mt-12 text-white font-bold">¿No sabes qué abogado elegir?</p>
          <a 
            href="/asesoria-legal-online" 
            className="text-white underline underline-offset-4 inline-flex items-center gap-1 hover:underline transition-colors"
          >
            Agenda una asesoría legal online →
          </a>
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
                  Todos los abogados están verificados con su RUT profesional y registro del Poder Judicial.
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
                  Precios claros sin tarifas ocultas. Sabes exactamente lo que vas a pagar antes de comenzar.
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
                  Tus datos y documentos se mantienen protegidos con cifrado y secreto profesional.
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
                <p className="text-sm text-gray-600 line-clamp-3">Tutela Laboral, Despidos Injustificados, Despido Indirecto, Nulidad del despido, Acoso Laboral, entre otros.</p>
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
                <p className="text-sm text-gray-600 line-clamp-3">Divorcios, Relación Directa y Regular, Filiación, Alimentos, Cuidado Personal, Medidas de Protección, Violencia Intrafamiliar, Autorización para salir del país, Adopción, Cumplimiento de Alimentos, entre otros.</p>
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
                <p className="text-sm text-gray-600 line-clamp-3">Nulidad de Contrato, Incumplimiento de contrato, Indemnización de Perjuicios, Juicio Ejecutivo, Juicio de Arrendamiento, Juicio de Precario, Cambio de Nombre, Interdicción, entre otros.</p>
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
                <p className="text-sm text-gray-600 line-clamp-3">Defensa penal en detenciones, formalizaciones y audiencias; representación de víctimas y presentación de querellas; asesoría en casos de delitos comunes; orientación frente a citaciones e investigaciones de Fiscalía; y gestión  salidas alternativas como acuerdos reparatorios o suspensiones condicionales, entre otros.</p>
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
                <p className="text-sm text-gray-600 line-clamp-3">Constitución de Sociedades, Modificación de Sociedades, Asesoramiento de empresas, Procedimiento de Reliquidación de Personas, entre otros.</p>
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
                <p className="text-sm text-gray-600 line-clamp-3">Registro de marcas comerciales ante INAPI, renovación y vigilancia de marcas, oposiciones y defensas en procedimientos administrativos, asesoría en derechos de autor, protección de nombres comerciales y logotipos, entre otros.</p>
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
      <section id="abogados-destacados" className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-50">
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
                  hideCard={true}
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

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Preguntas Frecuentes
            </h2>
            <p className="text-gray-600">
              Resuelve tus dudas sobre cómo funciona nuestra plataforma
            </p>
          </div>
          
          <div className="space-y-4">
            {[
              {
                question: "¿Cómo funciona LegalUp?",
                answer: "LegalUp conecta clientes con abogados verificados de forma rápida y segura. Solo debes buscar un abogado según tu necesidad legal, revisar su perfil, agendar una consulta y realizar el pago. Luego recibirás asesoría profesional por videollamada."
              },
              {
                question: "¿Cuánto cuesta una consulta?",
                answer: "El costo varía según el abogado y su especialidad. Cada abogado establece su tarifa por hora, y puedes ver el precio de la consulta claramente en su perfil antes de agendar. No hay tarifas ocultas, pagas exactamente lo que ves."
              },
              {
                question: "¿Puedo elegir al abogado?",
                answer: "Sí, tienes total libertad para elegir al abogado que prefieras. Puedes revisar sus perfiles, especialidades, experiencia y tarifas antes de tomar tu decisión."
              },
              {
                question: "¿En cuánto tiempo me atienden?",
                answer: "Muchos de nuestros abogados ofrecen disponibilidad inmediata o el mismo día. Al revisar el perfil del abogado, podrás ver su disponibilidad y agendar una cita en el horario que mejor te convenga."
              },
              {
                question: "¿La asesoría es por videollamada o chat?",
                answer: "La comunicación con tu abogado es por videollamada. Al agendar, recibirás automáticamente un enlace en tu correo para unirte a la reunión."
              }
            ].map((faq, index) => (
              <Card 
                key={index}
                className="border border-gray-200 hover:border-blue-600 transition-colors cursor-pointer"
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              >
                <CardHeader className="">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {faq.question}
                    </CardTitle>
                    <ChevronDown 
                      className={`h-5 w-5 text-blue-600 transition-transform duration-200 ${
                        openFaqIndex === index ? 'transform rotate-180' : ''
                      }`}
                    />
                  </div>
                </CardHeader>
                {openFaqIndex === index && (
                  <CardContent className="pt-0">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
          <div className="text-center mb-12">
            <p className="text-center text-gray-900 font-bold items-center mt-8">¿Tienes otra duda?</p>
            <Button
              onClick={() => navigate('/search')}
              className="bg-white border border-solid text-gray-900 hover:bg-black hover:text-white items-center mt-4"
            >
              Hablar con un abogado
            </Button>
          </div>
        </div>
      </section>

      {/* Dual CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Comienza hoy mismo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CTA para Clientes - Principal */}
            <Card className="border-none shadow-2xl z-10 relative bg-blue-600">
              <CardContent className="p-10">
                <div className="text-center">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    ¿Necesitas un Abogado?
                  </h3>
                  <p className="text-white mb-8">
                    Encuentra al abogado perfecto para tu caso. Asesoría legal profesional, rápida y segura.
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full bg-white hover:bg-blue-800 text-blue-600 hover:text-white font-bold shadow-lg hover:shadow-xl transition-all"
                    onClick={() => navigate('/search')}
                  >
                    Buscar Abogados
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CTA para Abogados - Secundario */}
            <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
              <CardContent className="p-10">
                <div className="text-center">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    ¿Eres Abogado?
                  </h3>
                  <p className="text-gray-600 mb-8">
                    Únete a nuestra plataforma y conecta con clientes. Impulsa el crecimiento de tu estudio.
                  </p>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold"
                    onClick={() => handleAuthClick('signup', 'lawyer')}
                    disabled={user?.user_metadata?.role === 'lawyer'}
                  >
                    {user?.user_metadata?.role === 'lawyer' ? 'Ya eres Abogado' : 'Comenzar como Abogado'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
