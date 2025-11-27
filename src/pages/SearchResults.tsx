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

// Define the Lawyer interface if not already defined in LawyerCard
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
  const initialSpecialty = categoryFromUrl || searchParams.get('specialty') || 'all';
  const initialLocation = searchParams.get('location') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
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
    availableNow
  }), [searchTerm, selectedSpecialty, location, minRating, minExperience, availableNow]);

  // Handle initial search term and set specialty if needed
  useEffect(() => {
    // Check if search term contains 'familia' and set the corresponding specialty
    if (initialQuery.toLowerCase().includes('familia') && selectedSpecialty !== 'Derecho de Familia') {
      setSelectedSpecialty('Derecho de Familia');
      
      // Update URL with the selected specialty
      const params = new URLSearchParams(searchParams.toString());
      params.set('specialty', 'Derecho de Familia');
      setSearchParams(params);
    }
  }, [initialQuery, searchParams, selectedSpecialty, setSearchParams]);

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
        const { searchLawyers } = await import('@/lib/api/lawyerSearch');
        const response = await searchLawyers({
          query,
          specialty,
          location,
          minRating,
          minExperience,
          availableNow
        }, page, currentPageSize);
        
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
    
    // Check if search term contains 'familia' and set the corresponding specialty
    const searchTermLower = searchTerm.toLowerCase();
    if (searchTermLower.includes('familia') && selectedSpecialty !== 'Derecho de Familia') {
      setSelectedSpecialty('Derecho de Familia');
      params.set('specialty', 'Derecho de Familia');
    } else if (selectedSpecialty !== 'all') {
      params.set('specialty', selectedSpecialty);
    }
    
    if (searchTerm) params.set('q', searchTerm);
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

  // Clear all filters
  const clearFilters = () => {
  setSearchTerm('');
  setSelectedSpecialty('all');
  setLocation('');
  setPriceRange([0, 1000000]);
  setMinRating(0);
  setMinExperience(0);
  setAvailableNow(false);
};

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
                      onClick={() => setSelectedSpecialty(specialty === 'Todas' ? 'all' : specialty === selectedSpecialty ? 'all' : specialty)}
                      className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                        selectedSpecialty === specialty || (specialty === 'Todas' && selectedSpecialty === 'all')
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
        onSpecialtyChange={setSelectedSpecialty}
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
          <div className="flex justify-end items-center gap-4 mb-6">
            <div className="flex items-center">
              <label htmlFor="sort" className="text-sm text-gray-600 mr-2">Ordenar por:</label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 w-48 pl-3 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
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
              className="border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-2"
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtros</span>
            </Button>
          </div>
          {(selectedSpecialty !== 'all' || location) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-gray-500">Filtros activos:</span>
              {selectedSpecialty !== 'all' && (
                <Badge className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 px-3 py-1 rounded-full">
                  {selectedSpecialty}
                  <button 
                    onClick={() => setSelectedSpecialty('all')}
                    className="ml-1 text-blue-500 hover:text-blue-700 rounded-full"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              )}
              {location && (
                <Badge className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 px-3 py-1 rounded-full">
                  {location}
                  <button 
                    onClick={() => setLocation('')}
                    className="ml-1 text-blue-500 hover:text-blue-700 rounded-full"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              )}
              {(selectedSpecialty !== 'all' || location) && (
                <button 
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline ml-1"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          )}
          
          {/* Results Grid with Virtualization */}
          {loading && !searchResult.lawyers.length ? (
            <div className="flex justify-center items-center py-16">
              <div className="h-12 w-12 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : searchResult.lawyers.length > 0 ? (
            <div className="w-full">
              <VirtualizedList
                items={searchResult.lawyers}
                itemSize={240}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                renderItem={(lawyer, index) => {
                  const rowData = { 
                    lawyers: searchResult.lawyers, 
                    user,
                    setSelectedLawyer,
                    setShowContactModal,
                    setShowScheduleModal,
                    setAuthMode,
                    setShowAuthModal
                  };
                  
                  return (
                    <LawyerRow 
                      key={lawyer.id} 
                      index={index} 
                      style={{}} 
                      data={rowData} 
                    />
                  );
                }}
              />
              
              {/* Loading indicator at the bottom */}
              {(loading || loadingMore) && (
                <div className="flex justify-center py-4">
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