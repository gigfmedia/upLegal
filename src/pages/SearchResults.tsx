import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { X, SlidersHorizontal, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
import { ContactModal } from "@/components/ContactModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// Dynamic import will be handled in component
import { useInView } from 'react-intersection-observer';
import { debounce } from 'lodash';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

const specialties = [
  "Derecho Civil",
  "Derecho Penal",
  "Derecho Laboral",
  "Derecho de Familia",
  "Derecho Comercial",
  "Derecho Tributario",
  "Derecho Inmobiliario",
  "Derecho de Salud",
  "Derecho de Seguros",
  "Derecho Ambiental",
  "Derecho de Consumidor",
  "Derecho Administrativo",
  "Derecho Procesal",
  "Derecho de Propiedad Intelectual",
  "Derecho de Seguridad Social",
  "Derecho Minero",
  "Derecho Aduanero",
  "Derecho Marítimo",
  "Derecho Aeronáutico",
  "Derecho Deportivo"
];

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

// Row component for virtualized list
const LawyerRow = ({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {
  // Get the lawyer data directly from the data prop
  const lawyer = data.lawyers[index];
  const { user, setShowAuthModal, setAuthMode } = data;
  const { setSelectedLawyer, setShowContactModal, setShowScheduleModal } = data;

  if (!lawyer) return null;

  return (
    <div style={style}>
      <LawyerCard 
        key={lawyer.id}
        lawyer={lawyer}
        user={user}
        onContactClick={() => {
          if (!user) {
            setAuthMode('login');
            setShowAuthModal(true);
          } else {
            setSelectedLawyer(lawyer);
            setShowContactModal(true);
          }
        }}
        onScheduleClick={() => {
          if (!user) {
            setAuthMode('login');
            setShowAuthModal(true);
          } else {
            setSelectedLawyer(lawyer);
            setShowScheduleModal(true);
          }
        }}
      />
    </div>
  );
};

// Virtualized list component using @tanstack/react-virtual
const VirtualizedList = ({ 
  items, 
  itemSize, 
  renderItem,
  className = ''
}: {
  items: any[];
  itemSize: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemSize,
    overscan: 5,
  });

  return (
    <div 
      ref={parentRef}
      className={`${className}`}
      style={{
        height: 'auto',
        width: '100%',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
};

const SearchResults = () => {
  const { user } = useAuth() as AuthContextType;
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Get search parameters from URL
  const initialQuery = searchParams.get('q') || '';
  const categoryFromUrl = searchParams.get('category');
  
  // Handle multiple specialty params
  const specialtyParams = searchParams.getAll('specialty');
  let initialSpecialties: string[] = [];
  
  if (categoryFromUrl) {
    initialSpecialties = [categoryFromUrl];
  } else if (specialtyParams.length > 0) {
    initialSpecialties = specialtyParams;
  } else {
    initialSpecialties = ['all'];
  }

  const initialLocation = searchParams.get('location') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string[]>(initialSpecialties);
  const [location, setLocation] = useState(initialLocation);
  const [sortBy, setSortBy] = useState('rating');
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
  
  // Modal states
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Infinite scroll ref
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Memoize search parameters to prevent unnecessary fetches
  const searchParamsMemo = useMemo(() => ({
    query: searchTerm,
    specialty: selectedSpecialty,
    location,
    minRating,
    minExperience,
    availableNow: false // Deshabilitar temporalmente availableNow hasta que se arregle la base de datos
  }), [searchTerm, selectedSpecialty, location, minRating, minExperience]);

  // Sync local state with URL parameters when they change
  useEffect(() => {
    console.log('🔄 Sincronizando parámetros de búsqueda desde la URL');
    const urlQuery = searchParams.get('q') || '';
    const urlCategory = searchParams.get('category');
    const urlSpecialties = searchParams.getAll('specialty');
    const urlLocation = searchParams.get('location') || '';
    
    console.log('📌 Parámetros de la URL:', {
      urlQuery,
      urlCategory,
      urlSpecialties,
      urlLocation
    });
    
    // Determine specialties from URL
    let newSpecialties: string[] = [];
    if (urlCategory) {
      newSpecialties = [urlCategory];
      console.log('🎯 Categoría seleccionada desde URL:', urlCategory);
    } else if (urlSpecialties.length > 0) {
      newSpecialties = urlSpecialties;
      console.log('🎯 Especialidades seleccionadas desde URL:', urlSpecialties);
    } else {
      newSpecialties = ['all'];
      console.log('ℹ️ No se encontraron especialidades en la URL, usando valor por defecto');
    }

    // Update search term if changed
    if (urlQuery !== searchTerm) {
      console.log('🔤 Actualizando término de búsqueda:', urlQuery);
      setSearchTerm(urlQuery);
    }
    
    // Update specialties if changed
    const isSameSpecialties = selectedSpecialty.length === newSpecialties.length && 
      selectedSpecialty.every((val, index) => val === newSpecialties[index]);
      
    if (!isSameSpecialties) {
      console.log('🏷️ Actualizando especialidades seleccionadas:', newSpecialties);
      setSelectedSpecialty(newSpecialties);
    } else {
      console.log('ℹ️ Las especialidades no han cambiado');
    }
    
    // Update location if changed
    if (urlLocation !== location) {
      console.log('📍 Actualizando ubicación:', urlLocation);
      setLocation(urlLocation);
    } else {
      console.log('ℹ️ La ubicación no ha cambiado');
    }
    
    // Trigger search with current parameters
    const shouldSearch = urlQuery || 
      (urlSpecialties.length > 0 && urlSpecialties[0] !== 'all') || 
      urlCategory || 
      urlLocation;
    
    if (shouldSearch) {
      console.log('🚀 Iniciando búsqueda con parámetros actualizados');
      const searchParams = {
        query: urlQuery,
        specialty: newSpecialties,
        location: urlLocation,
        minRating,
        minExperience,
        availableNow: false
      };
      
      console.log('🔍 Parámetros de búsqueda:', searchParams);
      
      debouncedSearchRef.current({
        page: 1,
        isInitialLoad: true,
        searchParams,
        currentPageSize: 12
      });
    } else if (searchParams.toString() === '') {
      // Si no hay parámetros, limpiar resultados
      console.log('🧹 Limpiando resultados de búsqueda');
      setSearchResult({
        lawyers: [],
        total: 0,
        page: 1,
        pageSize: 12,
        hasMore: false
      });
      setLoading(false);
    }
  }, [searchParams]); // Only depend on searchParams, not the state variables



  // Create a ref to store the debounced search function
  const debouncedSearchRef = useRef(
    debounce(async (params: {
      page: number;
      isInitialLoad: boolean;
      searchParams: typeof searchParamsMemo;
      currentPageSize: number;
    }) => {
      const { page, isInitialLoad, searchParams, currentPageSize } = params;
      const { query, specialty, location, minRating, minExperience, availableNow } = searchParams;
      
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        
        setError(null);
        
        // Use dynamic import for code splitting
        const { searchLawyers } = await import('@/pages/api/search-lawyers');
        
        console.log('🔍 Parámetros de búsqueda:', {
          query,
          specialty,
          location,
          minRating,
          minExperience,
          availableNow,
          page,
          pageSize: currentPageSize
        });
        
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
        
        console.log('📊 Respuesta de la búsqueda:', response);
        
        if (response) {
          //console.log('Raw API response:', response);
          
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
            consultationPrice: lawyer.hourly_rate_clp || 0,
            image: lawyer.avatar_url || '',
            bio: lawyer.bio && typeof lawyer.bio === 'string' && lawyer.bio.trim() !== '' ? lawyer.bio : 'Este abogado no ha proporcionado una biografía.',
            verified: lawyer.verified || false,
            availability: {
              availableToday: true,
              availableThisWeek: true,
              quickResponse: true,
              emergencyConsultations: true
            },
            availableToday: true,
            availableThisWeek: true,
            quickResponse: true,
            emergencyConsultations: true,
            experienceYears: lawyer.experience_years || 0
          }));

          // Then sort them by profile completeness and rating
          const sortedLawyers = [...formattedLawyers].sort((a, b) => {
            // Check if profile is complete (has all required fields)
            const isAComplete = a.verified && a.bio?.trim() && a.specialties?.length > 0 && 
                              a.location?.trim() && a.hourlyRate > 0;
            const isBComplete = b.verified && b.bio?.trim() && b.specialties?.length > 0 && 
                              b.location?.trim() && b.hourlyRate > 0;
            
            // Sort complete profiles first
            if (isAComplete && !isBComplete) return -1;
            if (!isAComplete && isBComplete) return 1;
            
            // If both have same completeness, sort by rating (highest first)
            return (b.rating || 0) - (a.rating || 0);
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

  // Effect to trigger search when search parameters change
  useEffect(() => {
    console.log('🔄 Efecto de búsqueda activado con parámetros:', searchParamsMemo);
    
    // Cancel any pending debounced search
    const debouncedSearch = debouncedSearchRef.current;
    
    // Always trigger search
    setLoading(true);
    console.log('🚀 Iniciando búsqueda (todos los abogados o con filtros)');
    
    // Trigger search with debounce
    debouncedSearch({
      page: 1,
      isInitialLoad: true,
      searchParams: searchParamsMemo,
      currentPageSize: searchResult.pageSize
    });

    // Cleanup function to cancel debounce on unmount
    return () => {
      console.log('🧹 Limpiando búsqueda debounce');
      debouncedSearch.cancel();
    };
  }, [searchParamsMemo, searchResult.pageSize]);

  // Wrapper function to call the debounced search
  const debouncedSearch = useCallback((page: number, isInitialLoad = false) => {
    debouncedSearchRef.current({
      page,
      isInitialLoad,
      searchParams: searchParamsMemo,
      currentPageSize: searchResult.pageSize
    });
  }, [searchParamsMemo, searchResult.pageSize]);

  // Fetch initial data and when filters change
  useEffect(() => {
    debouncedSearch(1, true);
    
    // No need for cleanup here as we handle it in the debounce ref cleanup
    return () => {
      // Cleanup is handled by the debouncedSearchRef cleanup effect
    };
  }, [debouncedSearch]);

  // Load more when scroll reaches the bottom
  useEffect(() => {
    if (inView && !loading && !loadingMore && searchResult.hasMore) {
      setSearchResult(prev => ({ ...prev, page: prev.page + 1 }));
      debouncedSearch(searchResult.page + 1, false);
    }
  }, [inView, loading, loadingMore, searchResult.hasMore, searchResult.page, debouncedSearch]);

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
      
      debouncedSearch(1, true);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    
    // Handle specialty logic
    if (searchTermLower.includes('familia') && !selectedSpecialty.includes('Derecho de Familia')) {
      // If searching for familia, ensure it's selected (replacing 'all' if present)
      const newSpecialties = selectedSpecialty.filter(s => s !== 'all');
      if (!newSpecialties.includes('Derecho de Familia')) {
        newSpecialties.push('Derecho de Familia');
      }
      setSelectedSpecialty(newSpecialties);
      newSpecialties.forEach(s => params.append('specialty', s));
    } else if (selectedSpecialty.length > 0 && selectedSpecialty[0] !== 'all') {
      selectedSpecialty.forEach(s => params.append('specialty', s));
    }
    
    // Only add search term if it's not empty
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
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
    
    debouncedSearch(1, true);
  }, [searchTerm, selectedSpecialty, location, debouncedSearch, setSearchParams]);

  // Get the lawyers from the search result
  const filteredLawyers = useMemo(() => {
    if (loading && !searchResult.lawyers.length) {
      return [];
    }
    
    // Apply client-side sorting only
    return [...searchResult.lawyers].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.consultationPrice - b.consultationPrice;
        case 'price-desc':
          return b.consultationPrice - a.consultationPrice;
        case 'rating':
        case 'rating-desc':
          return b.rating - a.rating;
        case 'reviews':
        case 'reviews-desc':
          return (b.reviews || 0) - (a.reviews || 0);
        case 'relevance':
          if (searchTerm) {
            const searchTermLower = searchTerm.toLowerCase();
            const aMatch = a.name.toLowerCase().includes(searchTermLower) ? 1 : 0;
            const bMatch = b.name.toLowerCase().includes(searchTermLower) ? 1 : 0;
            return bMatch - aMatch || b.rating - a.rating;
          }
          return b.rating - a.rating;
        default:
          return 0;
      }
    });
  }, [searchResult.lawyers, loading, searchTerm, sortBy]);

  // Handle applying filters
  const handleApplyFilters = useCallback((filters: {
    priceRange: [number, number];
    minRating: number;
    minExperience: number;
    availableNow: boolean;
  }) => {
    setPriceRange(filters.priceRange);
    setMinRating(filters.minRating);
    setMinExperience(filters.minExperience);
    setAvailableNow(filters.availableNow);
  }, []);

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
    console.log('clearFilters called');
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

  const handleContactClick = (lawyer: Lawyer) => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
    } else {
      setSelectedLawyer(lawyer);
      setShowContactModal(true);
    }
  };

  const handleScheduleClick = (lawyer: Lawyer) => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
    } else {
      setSelectedLawyer(lawyer);
      setShowScheduleModal(true);
    }
  };

  // clearFilters function is now defined above
  
  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Header />
      
      {/* Header and Search */}
      <div className="bg-white py-8 pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Encuentra al abogado ideal para tu caso</h1>
          <p className="mt-2 text-gray-600">Busca por especialidad, ubicación o nombre del abogado</p>
          
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
            <div className="relative">
              <Swiper
                modules={[Navigation]}
                spaceBetween={8}
                slidesPerView={'auto'}
                navigation={{
                  nextEl: '.swiper-button-next-specialties',
                  prevEl: '.swiper-button-prev-specialties',
                  disabledClass: 'opacity-30 cursor-not-allowed',
                }}
                className="py-2 px-2"
                style={{ paddingLeft: '8px', paddingRight: '8px' }}
              >
                {[
                  'Todas',
                  'Derecho Laboral', 
                  'Derecho de Familia', 
                  'Derecho Civil', 
                  'Derecho Penal', 
                  'Derecho Comercial', 
                  'Derecho Inmobiliario', 
                  'Derecho Tributario',
                  'Derecho de Seguros',
                  'Derecho de Propiedad Intelectual',
                  'Derecho Ambiental',
                  'Derecho Bancario',
                  'Derecho de Consumidor',
                  'Derecho Migratorio',
                  'Derecho de Salud'
                ].map((specialty) => (
                  <SwiperSlide key={specialty} className="w-auto" style={{ width: 'auto' }}>
                    <button
                      onClick={() => {
                        const value = specialty === 'Todas' ? 'all' : specialty;
                        let newSpecialties = [...selectedSpecialty];
                        
                        if (value === 'all') {
                          newSpecialties = ['all'];
                        } else {
                          // Remove 'all' if present
                          newSpecialties = newSpecialties.filter(s => s !== 'all');
                          
                          if (newSpecialties.includes(value)) {
                            newSpecialties = newSpecialties.filter(s => s !== value);
                          } else {
                            newSpecialties.push(value);
                          }
                          
                          if (newSpecialties.length === 0) newSpecialties = ['all'];
                        }
                        
                        handleSpecialtyChange(newSpecialties);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                        selectedSpecialty.includes(specialty === 'Todas' ? 'all' : specialty)
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
                      }`}
                      style={{
                        padding: '0.5rem 1.25rem',
                        fontSize: '0.875rem',
                        lineHeight: '1.25rem',
                        fontWeight: 500,
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      {specialty}
                    </button>
                  </SwiperSlide>
                ))}
              </Swiper>
              <button className="swiper-button-prev-specialties absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 focus:outline-none">
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button className="swiper-button-next-specialties absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 focus:outline-none">
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            {/* Active Filters (Left Side) */}
            <div className="w-full md:flex-1">
              {(selectedSpecialty.some(s => s !== 'all') || location) ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-500">Filtros activos:</span>
                  {selectedSpecialty.filter(s => s !== 'all').map((specialty) => (
                    <div key={specialty} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                      {specialty}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Removing specialty filter:', specialty);
                          
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
                            
                            console.log('Updated URL params:', params.toString());
                            return params;
                          });
                          
                          // Then update the state
                          setSelectedSpecialty(updatedSpecialties);
                        }}
                        className="ml-1 text-blue-500 hover:text-blue-700 rounded-full focus:outline-none hover:bg-blue-200 p-0.5 transition-colors"
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
                          console.log('Removing location filter');
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
                  {(selectedSpecialty !== 'all' || location) && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Clearing all filters');
                        clearFilters();
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline ml-1 focus:outline-none font-medium"
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
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-10 w-full sm:w-48 pl-3 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="relevance">Relevancia</option>
                  <option value="rating-desc">Mejor valorados</option>
                  <option value="price-asc">Precio más bajo</option>
                  <option value="price-desc">Precio más alto</option>
                  <option value="reviews-desc">Más reseñas</option>
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
          {loading && !searchResult.lawyers.length ? (
            <div className="flex justify-center items-center py-16">
              <div className="h-12 w-12 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : searchResult.lawyers.length > 0 ? (
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
                {searchResult.lawyers.map((lawyer) => {
                  // Usar onContact y onSchedule para compatibilidad con versiones anteriores
                  const handleContact = () => handleContactClick(lawyer);
                  const handleSchedule = () => handleScheduleClick(lawyer);
                  
                  return (
                    <div key={lawyer.id} className="w-full h-full">
                      <LawyerCard
                        lawyer={lawyer}
                        onContactClick={handleContact}
                        onScheduleClick={handleSchedule}
                        onContact={handleContact} // Para compatibilidad
                        onSchedule={handleSchedule} // Para compatibilidad
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
              <div className="mx-auto h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron abogados</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">No hay resultados que coincidan con tu búsqueda. Intenta con otros términos o ajusta los filtros.</p>
              <Button 
                variant="outline"
                onClick={clearFilters}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
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
            lawyerId={selectedLawyer.id}
            lawyerName={selectedLawyer.name}
            hourlyRate={selectedLawyer.hourlyRate}
          />
        </>
      )}
    </div>
  );
};

export default SearchResults;