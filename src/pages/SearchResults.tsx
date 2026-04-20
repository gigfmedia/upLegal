import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { X, SlidersHorizontal, Search } from "lucide-react";
import { Helmet } from 'react-helmet-async';
import { Lawyer } from "@/components/LawyerCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/SearchBar";
import { SearchFilters } from "@/components/SearchFilters";
import { LawyerCard } from "@/components/LawyerCard";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthContextType } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import * as React from 'react';
import { useInView } from 'react-intersection-observer';
import debounce from 'lodash/debounce';
import { Skeleton } from "@/components/ui/skeleton";
import { detectEspecialidad } from "@/utils/askLLM";

const SpecialtiesSlider = lazy(() => import('@/components/search/SpecialtiesSlider'));

const specialties = [
  "Derecho Civil",
  "Derecho Penal",
  "Derecho Laboral",
  "Derecho de Familia",
  "Derecho Comercial",
  "Derecho Administrativo",
  "Derecho Tributario",
  "Derecho Inmobiliario",
  "Propiedad Intelectual",
  "Derecho de Salud",
  "Derecho Migratorio"
];

// Helper to normalize specialty names from long format to short format
const normalizeSpecialty = (s: string | null): string => {
  if (!s) return 'all';
  const lower = s.toLowerCase();
  if (lower.includes('familia')) return 'Derecho de Familia';
  if (lower.includes('laboral')) return 'Derecho Laboral';
  if (lower.includes('penal')) return 'Derecho Penal';
  if (lower.includes('inmobiliario')) return 'Derecho Inmobiliario';
  if (lower.includes('comercial')) return 'Derecho Comercial';
  if (lower.includes('tributario')) return 'Derecho Tributario';
  if (lower.includes('civil')) return 'Derecho Civil';
  if (lower.includes('salud')) return 'Derecho de Salud';
  if (lower.includes('administrativo')) return 'Derecho Administrativo';
  if (lower.includes('propiedad intelectual')) return 'Propiedad Intelectual';
  if (lower.includes('migracion') || lower.includes('migratorio') || lower.includes('extranjeria')) return 'Derecho Migratorio';
  return s;
};

const chileanLocations = [
  // Región de Arica y Parinacota
  'Arica', 'Putre', 'General Lagos', 'Camarones',
  
  // Región de Tarapacá
  'Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica', 'Huara', 'Colchane',
  
  // Región de Antofagasta
  'Antofagasta', 'Calama', 'Tocopilla', 'Mejillones', 'Taltal', 'San Pedro de Atacama', 'María Elena',
  
  // Región de Atacama
  'Copiapó', 'Caldera', 'Tierra Amarilla', 'Chañaral', 'Diego de Almagro', 'Vallenar', 'Alto del Carmen', 'Freirina', 'Huasco',
  
  // Región de Coquimbo
  'La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Los Vilos', 'Salamanca', 'Vicuña', 'Paihuano', 'Andacollo', 'La Higuera',
  
  // Región de Valparaíso
  'Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'San Antonio', 'Quillota', 'San Felipe', 'Los Andes', 'La Ligua', 'Zapallar',
  
  // Región Metropolitana
  'Santiago', 'Maipú', 'Puente Alto', 'La Florida', 'Las Condes', 'Providencia', 'Ñuñoa', 'La Reina', 'Peñalolén', 'La Pintana',
  
  // Región del Libertador Bernardo O'Higgins
  'Rancagua', 'San Fernando', 'Santa Cruz', 'Pichilemu', 'San Vicente de Tagua Tagua', 'Rengo', 'Machalí',
  
  // Región del Maule
  'Talca', 'Curicó', 'Linares', 'Constitución', 'Cauquenes', 'Parral', 'San Javier',
  
  // Región de Ñuble
  'Chillán', 'Chillán Viejo', 'Bulnes', 'Quirihue', 'San Carlos', 'Coihueco',
  
  // Región del Biobío
  'Concepción', 'Talcahuano', 'Los Ángeles', 'Coronel', 'Chiguayante', 'San Pedro de la Paz', 'Lota', 'Lebu', 'Los Ángeles',
  
  // Región de La Araucanía
  'Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Victoria', 'Lautaro',
  
  // Región de Los Ríos
  'Valdivia', 'La Unión', 'Panguipulli', 'Paillaco', 'Río Bueno', 'Los Lagos',
  
  // Región de Los Lagos
  'Puerto Montt', 'Osorno', 'Castro', 'Ancud', 'Puerto Varas', 'Frutillar', 'Calbuco', 'Puerto Octay',
  
  // Región de Aysén
  'Coyhaique', 'Puerto Aysén', 'Chile Chico', 'Cochrane', 'Villa O\'Higgins',
  
  // Región de Magallanes
  'Punta Arenas', 'Puerto Natales', 'Porvenir', 'Puerto Williams'
];



const SearchResults = () => {
  const { user } = useAuth() as AuthContextType;
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Get search parameters from URL
  const initialQuery = searchParams.get('query') || '';
  const categoryFromUrl = searchParams.get('category');
  
  // Handle multiple specialty params
  const specialtyParams = searchParams.getAll('specialty');
  let initialSpecialties: string[] = [];
  
  if (categoryFromUrl) {
    initialSpecialties = [normalizeSpecialty(categoryFromUrl)];
  } else if (specialtyParams.length > 0) {
    initialSpecialties = specialtyParams.map(s => normalizeSpecialty(s));
  } else if (initialQuery) {
    const detected = detectEspecialidad(initialQuery);
    if (detected) {
      initialSpecialties = [normalizeSpecialty(detected)];
    } else {
      initialSpecialties = ['all'];
    }
  } else {
    initialSpecialties = ['all'];
  }

  const initialLocation = searchParams.get('location') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string[]>(initialSpecialties);
  const [location, setLocation] = useState(initialLocation);
  const [sortBy, setSortBy] = useState(() => {
    return searchParams.get('sort') || 'relevance';
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // New filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [availableNow, setAvailableNow] = useState<boolean>(false);
  
  const [searchResult, setSearchResult] = useState<{
    lawyers: Lawyer[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>({ 
    lawyers: [], 
    total: 0, 
    page: 1, 
    pageSize: 12, // Increased page size for better initial load
    hasMore: true 
  });
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSpecialtiesSlider, setShowSpecialtiesSlider] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShowSpecialtiesSlider(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  
  // Modal states
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  
  
  // Infinite scroll ref
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Sync local state with URL parameters when they change
  useEffect(() => {
    const urlQuery = searchParams.get('query') || '';
    const urlCategory = searchParams.get('category');
    const urlSpecialties = searchParams.getAll('specialty');
    const urlLocation = searchParams.get('location') || '';
    const urlMinRating = Number(searchParams.get('minRating')) || 0;
    const urlMinExperience = Number(searchParams.get('minExperience')) || 0;
    // const urlAvailableNow = searchParams.get('availableNow') === 'true'; // Not used in backend query yet
    
    // Determine specialties from URL
    let newSpecialties: string[] = [];
    if (urlCategory) {
      newSpecialties = [normalizeSpecialty(urlCategory)];
    } else if (urlSpecialties.length > 0) {
      newSpecialties = urlSpecialties.map(s => normalizeSpecialty(s));
    } else if (urlQuery) {
      const detected = detectEspecialidad(urlQuery);
      if (detected) {
        newSpecialties = [normalizeSpecialty(detected)];
      } else {
        newSpecialties = ['all'];
      }
    } else {
      newSpecialties = ['all'];
    }

    // Sync state from URL without depending on state variables (avoids exhaustive-deps loop)
    setSearchTerm((prev) => (prev === urlQuery ? prev : urlQuery));
    setSelectedSpecialty((prev) => {
      const isSame =
        prev.length === newSpecialties.length &&
        prev.every((val, index) => val === newSpecialties[index]);
      return isSame ? prev : newSpecialties;
    });
    setLocation((prev) => (prev === urlLocation ? prev : urlLocation));
    setMinRating((prev) => (prev === urlMinRating ? prev : urlMinRating));
    setMinExperience((prev) => (prev === urlMinExperience ? prev : urlMinExperience));

    
    // Trigger search using URL-derived values (avoid stale state + fixes hook deps)
    const hasSearchFilters = Boolean(
      urlQuery ||
        (urlSpecialties.length > 0 && urlSpecialties[0] !== 'all') ||
        urlCategory ||
        urlLocation ||
        urlMinRating > 0 ||
        urlMinExperience > 0
    );

    if (hasSearchFilters) {
      setLoading(true);
      debouncedSearchRef.current({
        page: 1,
        isInitialLoad: true,
        searchParams: {
          query: urlQuery,
          specialty: newSpecialties,
          location: urlLocation,
          minRating: urlMinRating,
          minExperience: urlMinExperience,
          availableNow: false
        },
        currentPageSize: 12
      });
    } else {
      // Si no hay filtros específicos (o solo hay UTMs/parámetros irrelevantes), buscar todos los abogados
      setLoading(true);
      debouncedSearchRef.current({
        page: 1,
        isInitialLoad: true,
        searchParams: {
          query: '',
          specialty: ['all'],
          location: '',
          minRating: 0,
          minExperience: 0,
          availableNow: false
        },
        currentPageSize: 12
      });
    }
  }, [searchParams]); // Only depend on searchParams, not state variables



  // Create a ref to store the debounced search function
  const debouncedSearchRef = useRef(
    debounce(async (params: {
      page: number;
      isInitialLoad: boolean;
      searchParams: {
        query: string;
        specialty: string[];
        location: string;
        minRating: number;
        minExperience: number;
        availableNow: boolean;
      };
      currentPageSize: number;
    }) => {
      const { page, isInitialLoad, searchParams, currentPageSize } = params;
      
      // Add safety check for searchParams
      const safeSearchParams = searchParams || {
        query: '',
        specialty: '',
        location: '',
        minRating: 0,
        minExperience: 0,
        availableNow: false
      };
      
      const { query, specialty, location, minRating, minExperience, availableNow } = safeSearchParams;
      
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        
        setError(null);
        
        // Use dynamic import for code splitting
        const { searchLawyers } = await import('@/pages/api/search-lawyers');
        
        const response = await searchLawyers({
          query: query || '',
          specialty: specialty && specialty[0] !== 'all' ? specialty : undefined,
          location: location || undefined,
          minRating: minRating || undefined,
          minExperience: minExperience || undefined,
          availableNow: availableNow || false,
          page,
          pageSize: currentPageSize
        });
        
        
        if (response) {
          // First, format all lawyers
          const formattedLawyers = response.lawyers.map(lawyer => ({
            id: lawyer.id,
            user_id: lawyer.user_id,
            name: `${lawyer.first_name} ${lawyer.last_name}`.trim(),
            specialties: lawyer.specialties || [],
            rating: lawyer.rating || 0,
            reviews: lawyer.review_count || 0,
            location: lawyer.location || 'Sin ubicación',
            cases: 0,
            hourlyRate: lawyer.hourly_rate_clp || 0,
            consultationPrice: lawyer.contact_fee_clp || lawyer.hourly_rate_clp || 0,
            image: lawyer.avatar_url || '',
            bio: lawyer.bio && typeof lawyer.bio === 'string' && lawyer.bio.trim() !== '' ? lawyer.bio : 'Este abogado no ha proporcionado una biografía.',
            verified: Boolean(lawyer.verified),
            blocked: lawyer.blocked || false,
            availability: {
              availableToday: Boolean(lawyer.available_today),
              availableThisWeek: Boolean(lawyer.available_this_week),
              quickResponse: true,
              emergencyConsultations: true
            },
            availableToday: Boolean(lawyer.available_today),
            availableThisWeek: Boolean(lawyer.available_this_week),
            quickResponse: true,
            emergencyConsultations: true,
            experience_years: lawyer.experience_years || 0,
            experienceYears: lawyer.experience_years || 0,
            availability_config: (() => {
              if (!lawyer.availability) return undefined;
              if (typeof lawyer.availability === 'object') return lawyer.availability;
              if (typeof lawyer.availability === 'string' && lawyer.availability.trim() !== '') {
                try {
                  return JSON.parse(lawyer.availability);
                } catch (e) {
                  console.error('Error parsing availability for lawyer:', lawyer.id, e);
                  return undefined;
                }
              }
              return undefined;
            })()
          }));

          // Then sort them by profile completeness and rating
          const sortedLawyers = [...formattedLawyers].sort((a, b) => {
            // First priority: Verified status (verified MUST come first)
            const aVerified = Boolean(a.verified);
            const bVerified = Boolean(b.verified);
            
            if (aVerified && !bVerified) return -1;
            if (!aVerified && bVerified) return 1;

            // Second priority: Profile completeness (complete profiles first)
            const isAComplete = Boolean(a.bio?.trim() && a.specialties?.length > 0 && 
                              a.location?.trim() && a.hourlyRate > 0);
            const isBComplete = Boolean(b.bio?.trim() && b.specialties?.length > 0 && 
                              b.location?.trim() && b.hourlyRate > 0);
            
            if (isAComplete && !isBComplete) return -1;
            if (!isAComplete && isBComplete) return 1;
            
            // Third priority: Rating (higher rating first)
            const aRating = Number(a.rating) || 0;
            const bRating = Number(b.rating) || 0;
            
            if (isAComplete && isBComplete) {
              return bRating - aRating;
            }
            
            // For incomplete profiles, also sort by rating
            return bRating - aRating;
          });

          setSearchResult(prev => ({
            lawyers: page === 1 ? sortedLawyers : [...prev.lawyers, ...sortedLawyers],
            total: response.total || 0,
            page,
            pageSize: response.pageSize || 10,
            hasMore: (page * (response.pageSize || 10)) < (response.total || 0)
          }));
        }
      } catch (err) {
        setError('Error al cargar los abogados. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }, 300) // 300ms debounce delay
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, []);

  // Load more when scroll reaches the bottom
  useEffect(() => {
    if (inView && !loading && !loadingMore && searchResult.hasMore) {
      const nextPage = searchResult.page + 1;
      setLoadingMore(true);
      debouncedSearchRef.current({
        page: nextPage,
        isInitialLoad: false,
        searchParams: {
          query: searchTerm,
          specialty: selectedSpecialty,
          location,
          minRating,
          minExperience,
          availableNow: false
        },
        currentPageSize: searchResult.pageSize
      });
    }
  }, [inView, loading, loadingMore, searchResult.hasMore, searchResult.page, searchResult.pageSize, searchTerm, selectedSpecialty, location, minRating, minExperience]);

  // Handle search
  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    
    // If search term is empty, clear the search and show all lawyers
    if (!searchTerm.trim()) {
      setSearchTerm('');
      setSelectedSpecialty(['all']);
      setLocation('');
      setSearchParams(new URLSearchParams());
      
      setSearchResult(prev => ({
        ...prev,
        page: 1,
        lawyers: [],
        hasMore: true
      }));
      
      debouncedSearchRef.current({
        page: 1,
        isInitialLoad: true,
        searchParams: {
          query: '',
          specialty: ['all'],
          location: '',
          minRating: 0,
          minExperience: 0,
          availableNow: false
        },
        currentPageSize: searchResult.pageSize
      });
      return;
    }
    
    // Handle specialty logic intelligently with natural language mapping
    const detected = detectEspecialidad(searchTerm);
    if (detected) {
      const normalizedDetected = normalizeSpecialty(detected);
      if (!selectedSpecialty.includes(normalizedDetected)) {
        // If detected specialty is not selected, add it (replacing 'all' if present)
        const newSpecialties = selectedSpecialty.filter(s => s !== 'all');
        newSpecialties.push(normalizedDetected);
        setSelectedSpecialty(newSpecialties);
        newSpecialties.forEach(s => params.append('specialty', s));
      } else {
        selectedSpecialty.forEach(s => params.append('specialty', s));
      }
    } else if (selectedSpecialty.length > 0 && selectedSpecialty[0] !== 'all') {
      selectedSpecialty.forEach(s => params.append('specialty', s));
    }
    
    // Only add search term if it's not empty
    if (searchTerm.trim()) {
      params.set('query', searchTerm.trim());
    }
    
    if (location) params.set('location', location);
    setSearchParams(params);
    
    // Reset pagination and load first page
    setSearchResult(prev => ({
      ...prev,
      page: 1,
      lawyers: [],
      hasMore: true
    }));
    
    debouncedSearchRef.current({
      page: 1,
      isInitialLoad: true,
      searchParams: {
        query: searchTerm,
        specialty: selectedSpecialty,
        location,
        minRating,
        minExperience,
        availableNow: false
      },
      currentPageSize: searchResult.pageSize
    });
  }, [searchTerm, selectedSpecialty, location, minRating, minExperience, searchResult.pageSize, setSearchParams]);

  // Get the lawyers from the search result
  const filteredLawyers = useMemo(() => {
    if (loading && !searchResult.lawyers.length) {
      return [];
    }
    
    // Apply client-side sorting
    return [...searchResult.lawyers].sort((a, b) => {
      // First priority: Verified status (verified MUST come first)
      const aVerified = Boolean(a.verified);
      const bVerified = Boolean(b.verified);
      
      if (aVerified && !bVerified) return -1;
      if (!aVerified && bVerified) return 1;

      // Second priority: Profile completeness (complete profiles first)
      const isAComplete = Boolean(a.bio?.trim() && a.specialties?.length > 0 && 
                                a.location?.trim() && a.hourlyRate > 0);
      const isBComplete = Boolean(b.bio?.trim() && b.specialties?.length > 0 && 
                                b.location?.trim() && b.hourlyRate > 0);
      
      if (isAComplete && !isBComplete) return -1;
      if (!isAComplete && isBComplete) return 1;

      // Then apply selected sort criteria
      switch (sortBy) {
        case 'price':
          return a.consultationPrice - b.consultationPrice; // Precio: de menor a mayor
        case 'rating':
          return b.rating - a.rating; // Mejor calificados
        case 'experience':
          return (b.experience_years || 0) - (a.experience_years || 0); // Más experiencia
        case 'relevance':
        default:
          // Relevance: Already handled by verified and completeness logic above
          // Just sort by rating within complete/incomplete groups
          return b.rating - a.rating;
      }
    });
  }, [searchResult.lawyers, loading, searchTerm, sortBy]);

  // Handle applying filters
  const handleApplyFilters = useCallback((filters: {
    priceRange: [number, number];
    minRating: number;
    minExperience: number;
    availableNow: boolean;
    modality?: string;
    region?: string;
  }) => {
    // Update local state is handled by URL sync now, but we can update optimistically/redundantly
    setPriceRange(filters.priceRange);
    
    // Update URL params to trigger search and persistence
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      
      // Update Min Experience
      if (filters.minExperience > 0) {
        params.set('minExperience', filters.minExperience.toString());
      } else {
        params.delete('minExperience');
      }

      // Update Min Rating
      if (filters.minRating > 0) {
        params.set('minRating', filters.minRating.toString());
      } else {
        params.delete('minRating');
      }

      // Handle Modality & Region (Location)
      if (filters.modality === 'presencial' && filters.region) {
        params.set('location', filters.region);
      } else if (filters.modality !== 'presencial') {
        params.delete('location');
      }

      // Note: availableNow and priceRange might not be fully supported in URL/Backend yet based on previous analysis
      
      return params;
    });

  }, [setSearchParams]);

  // Handle specialty change from filters
  const handleSpecialtyChange = useCallback((specialties: string[]) => {
    setSelectedSpecialty(specialties);
    
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.delete('specialty');
      params.delete('category'); // Clear category if specialty changes
      
      specialties.forEach(s => {
        if (s !== 'all') params.append('specialty', s);
      });
      
      return params;
    });
  }, [setSearchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    // Show loading state
    setLoading(true);
    
    // Reset all search-related states
    setSearchTerm('');
    setSelectedSpecialty(['all']);
    setLocation('');
    setMinRating(0);
    setMinExperience(0);
    setAvailableNow(false);
    setPriceRange([0, 1000000]);
    
    // Clear URL parameters
    setSearchParams(new URLSearchParams());
    
    // Force a search with empty parameters to show all lawyers
    debouncedSearchRef.current({
      page: 1,
      isInitialLoad: true,
      searchParams: {
        query: '',
        specialty: ['all'],
        location: '',
        minRating: 0,
        minExperience: 0,
        availableNow: false
      },
      currentPageSize: 12
    });
  }, [setSearchParams]);



  // Scroll to lawyer cards when coming from category click
  useEffect(() => {
    // Check if we have a category parameter (coming from category click on homepage)
    const hasCategoryParam = searchParams.get('category');
    
    if (hasCategoryParam && !loading && filteredLawyers.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const afterSpecialties = document.getElementById('after-specialties');
        if (afterSpecialties) {
          const isMobile = window.innerWidth < 768;
          const offset = isMobile ? 80 : 0; // Offset para mobile para dejar espacio visual
          const elementPosition = afterSpecialties.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: elementPosition - offset,
            behavior: 'smooth'
          });
        }
      }, 150); // Delay ligeramente mayor para asegurar render completo en mobile
    }
  }, [loading, filteredLawyers.length, searchParams]);
  
  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Helmet>
        <link rel="canonical" href="https://legalup.cl/search" />
      </Helmet>
      <Header />
      
      {/* Header and Search */}
      <div className="bg-white py-8 pt-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold font-serif text-gray-900">Haz Match con el abogado ideal para tu caso</h1>
          <p className="text-gray-600">Agenda una asesoría legal online con abogados verificados, precios transparentes y sin compromisos.</p>
          <small className="text-xs text-gray-500">Abogados verificados en PJUD · Precios claros · Sin llamadas incómodas ni intermediarios</small>
          
          {/* Search Bar */}
          <div className="mt-6">
            <SearchBar 
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              location={location}
              onLocationChange={setLocation}
              onSearch={handleSearch}
              onFiltersClick={() => setShowFilters(true)}
              showMobileFilters={true}
            />
          </div>

          {/* Specialties Slider */}
          <div className="mt-4 relative">
            <h4 className="text-lg font-semibold mb-4">¿Buscas alguna subespecialidad?</h4>
            <div className="relative">
              <div className="min-h-[56px]">
                {showSpecialtiesSlider ? (
                  <Suspense fallback={<div className="h-14 w-full rounded-lg bg-gray-50 border border-gray-200" />}>
                    <SpecialtiesSlider
                      selectedSpecialty={selectedSpecialty}
                      onSpecialtyChange={handleSpecialtyChange}
                    />
                  </Suspense>
                ) : (
                  <div className="h-14 w-full rounded-lg bg-gray-50 border border-gray-200" />
                )}
              </div>
            </div>
            <div id="after-specialties" />
          </div>
        </div>
      </div>

      <SearchFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        selectedSpecialty={selectedSpecialty}
        onSpecialtyChange={handleSpecialtyChange}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        specialties={specialties}
        onApplyFilters={handleApplyFilters}
        onClearFilters={clearFilters}
      />

      {/* Contenido principal */}
      <div className="bg-muted min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Filtros y ordenamiento */}
          <div id="filters-section" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            {/* Active Filters (Left Side) */}
            <div className="w-full md:flex-1">
              {(selectedSpecialty.some(s => s !== 'all') || location) ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-500">Filtros activos:</span>
                  {selectedSpecialty.filter(s => s !== 'all').map((specialty) => (
                    <div key={specialty} className="inline-flex items-center gap-1 bg-gray-50 text-green-900 border border-green-600 hover:bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                      {specialty}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Create new specialties array without the removed one
                          const newSpecialties = selectedSpecialty.filter(s => s !== specialty);
                          const updatedSpecialties = newSpecialties.length > 0 ? newSpecialties : ['all'];
                          
                          // Show loading state
                          setLoading(true);
                          
                          // Update URL first
                          setSearchParams(prevParams => {
                            const params = new URLSearchParams();
                            
                            // Only keep location and other non-search parameters
                            if (location) params.set('location', location);
                            if (minRating > 0) params.set('minRating', minRating.toString());
                            if (minExperience > 0) params.set('minExperience', minExperience.toString());
                            
                            // Only add specialty if it's not 'all' and there are specialties left
                            if (updatedSpecialties[0] !== 'all') {
                              updatedSpecialties.forEach(s => {
                                if (s && s !== 'all') {
                                  params.append('specialty', s);
                                }
                              });
                            }
                            return params;
                          });
                          
                          // Then update the state
                          setSelectedSpecialty(updatedSpecialties);
                        }}
                        className="ml-1 text-green-500 hover:text-green-700 rounded-full focus:outline-none hover:bg-green-200 p-0.5 transition-colors"
                        type="button"
                        aria-label={`Remover filtro ${specialty}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {location && (
                    <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                      {location}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Use functional form to get latest params
                          setSearchParams((prevParams) => {
                            const params = new URLSearchParams(prevParams.toString());
                            params.delete('location');
                            return params;
                          });
                          // Don't manually update state - let the useEffect handle it
                        }}
                        className="ml-1 text-blue-500 hover:text-blue-700 rounded-full focus:outline-none hover:bg-blue-200 p-0.5 transition-colors"
                        type="button"
                        aria-label="Remover filtro de ubicación"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {(selectedSpecialty[0] !== 'all' || location) && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearFilters();
                      }}
                      className="text-sm text-green-900 hover:text-green-600 hover:underline ml-1 focus:outline-none font-medium"
                      type="button"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
              ) : (
                /* Empty div to maintain spacing if needed, or just empty */
                <div />
              )}
            </div>

            {/* Sort and Filter Controls (Right Side) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                <label htmlFor="sort" className="text-sm text-gray-600 mr-2 whitespace-nowrap">Ordenar por:</label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    // Update the URL with the new sort parameter
                    const params = new URLSearchParams(searchParams);
                    params.set('sort', e.target.value);
                    setSearchParams(params);
                  }}
                  className="h-10 w-full sm:w-48 pl-3 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="relevance">Recomendados</option>
                  <option value="rating">Mejor calificados</option>
                  <option value="experience">Experiencia</option>
                  <option value="price">Precio</option>
                </select>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full sm:w-auto border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                onClick={() => setShowFilters(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filtros</span>
              </Button>
            </div>
          </div>

          
          {/* Results Grid */}
          {loading && searchResult.lawyers.length === 0 ? (
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-full">
                    <div className="bg-white rounded-xl shadow-sm p-6 min-h-[300px]">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                      <div className="mt-6 grid grid-cols-1 gap-2">
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : searchResult.lawyers.length === 0 && !searchParams.toString() ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <div className="mx-auto h-16 w-16 bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Realiza una búsqueda para encontrar abogados</h3>
              <p className="text-gray-500">Ingresa un término de búsqueda o selecciona una especialidad para comenzar</p>
            </div>
          ) : filteredLawyers.length > 0 ? (
            <div className="w-full" id="lawyer-cards-section">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
                {filteredLawyers.map((lawyer) => {
                  return (
                    <div key={lawyer.id} className="w-full h-full">
                      <LawyerCard
                        lawyer={lawyer}
                        user={user}
                      />
                    </div>
                  );
                })}
              </div>
              
              {/* Loading indicator at the bottom */}
              {(loading || loadingMore) && (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="h-1 w-full" />
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <div className="mx-auto h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron abogados</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">No hay resultados que coincidan con tu búsqueda. Intenta con otros términos o ajusta los filtros.</p>
              <Button 
                variant="outline"
                onClick={clearFilters}
                className="border-green-900 text-gray-900 hover:bg-green-900 hover:text-white"
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={(mode) => setAuthMode(mode)}
      />
      
      {/* Modals moved or removed as per requirement */}
    </div>
  );
};

export default SearchResults;