import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { X, SlidersHorizontal, Search } from "lucide-react";
import { Helmet } from 'react-helmet-async';
import { Lawyer } from "@/components/LawyerCard";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { SearchFilters } from "@/components/SearchFilters";
import { LawyerCard } from "@/components/LawyerCard";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthContextType } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { useInView } from 'react-intersection-observer';
import { Skeleton } from "@/components/ui/skeleton";
import { detectEspecialidad } from "@/utils/askLLM";
import { useLegalCategoryClassifier } from "@/hooks/useLegalCategoryClassifier";
import SpecialtiesSlider from '@/components/search/SpecialtiesSlider';
import { PaymentMethods } from '@/components/MercadoPagoBadge';

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

const normalizeSpecialty = (s: string | null): string => {
  if (!s) return 'all';
  const lower = s.toLowerCase();
  if (lower.includes('familia')) return 'Derecho de Familia';
  if (lower.includes('laboral')) return 'Derecho Laboral';
  if (lower.includes('penal')) return 'Derecho Penal';
  if (lower.includes('inmobiliario')) return 'Derecho Inmobiliario';
  if (lower.includes('arriendo') || lower.includes('arrendamiento')) return 'Derecho Inmobiliario';
  if (lower.includes('comercial')) return 'Derecho Comercial';
  if (lower.includes('tributario')) return 'Derecho Tributario';
  if (lower.includes('civil')) return 'Derecho Civil';
  if (lower.includes('consumidor')) return 'Derecho de Consumidor';
  if (lower.includes('salud')) return 'Derecho de Salud';
  if (lower.includes('administrativo')) return 'Derecho Administrativo';
  if (lower.includes('propiedad intelectual')) return 'Propiedad Intelectual';
  if (lower.includes('migracion') || lower.includes('migratorio') || lower.includes('extranjeria')) return 'Derecho Migratorio';
  return s;
};

const SearchResults = () => {
  const { user } = useAuth() as AuthContextType;
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const viewLawyersTrackedRef = useRef<{ key: string; timestamp: number } | null>(null);
  const initialLoadDone = useRef(false);
  const isSearching = useRef(false);
  const hasScrolledToSort = useRef(false);

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string[]>(['all']);
  const [location, setLocation] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [minExperience, setMinExperience] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [availableNow, setAvailableNow] = useState(false);

  const [searchResult, setSearchResult] = useState({
    lawyers: [] as Lawyer[],
    total: 0,
    page: 1,
    pageSize: 12,
    hasMore: true
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref estable que almacena los parámetros de búsqueda actuales.
  // Permite que el efecto de carga infinita lea los valores actuales SIN
  // ser dependencia reactiva de ellos, evitando el loop de re-renders.
  const currentSearchParamsRef = useRef({
    query: '',
    specialty: ['all'] as string[],
    location: '',
    minRating: 0,
    minExperience: 0,
    availableNow: false,
    pageSize: 12,
  });

  // Ref para el número de página actual de la paginación infinita.
  // Evita incluir searchResult.page como dep del efecto de scroll.
  const currentPageRef = useRef(1);
  const hasMoreRef = useRef(true);

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1, triggerOnce: false });

  // Función de búsqueda
  const performSearch = useCallback(async (params: {
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
    pageSize: number;
  }) => {
    if (isSearching.current) return;
    const { page, isInitialLoad, searchParams, pageSize } = params;
    const { query, specialty, location, minRating, minExperience, availableNow } = searchParams;

    try {
      isSearching.current = true;
      if (isInitialLoad) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const { searchLawyers } = await import('@/pages/api/search-lawyers');
      const response = await searchLawyers({
        query: query || '',
        specialty: specialty && specialty[0] !== 'all' ? specialty : undefined,
        location: location || undefined,
        minRating: minRating || undefined,
        minExperience: minExperience || undefined,
        availableNow: availableNow || false,
        page,
        pageSize
      });

      if (response?.lawyers) {
        const formatted = response.lawyers.map((lawyer: any) => {
          const rawRate = lawyer.hourly_rate_clp || 0;
          const displayRate = Math.round(rawRate * 1.1 / 1000) * 1000;
          return {
            id: lawyer.id,
            user_id: lawyer.user_id,
            first_name: lawyer.first_name,
            last_name: lawyer.last_name,
            name: `${lawyer.first_name} ${lawyer.last_name}`.trim(),
            display_name: `${lawyer.first_name} ${lawyer.last_name}`.trim(),
            specialties: lawyer.specialties || [],
            rating: lawyer.rating || 0,
            reviews: lawyer.review_count || 0,
            review_count: lawyer.review_count || 0,
            location: lawyer.location?.trim() || '',
            cases: 0,
            hourlyRate: rawRate,
            hourly_rate_clp: rawRate,
            consultationPrice: displayRate,
            contact_fee_clp: displayRate,
            image: lawyer.avatar_url || '',
            avatar_url: lawyer.avatar_url || '',
            bio: lawyer.bio?.trim() || 'Este abogado no ha proporcionado una biografía.',
            verified: Boolean(lawyer.verified),
            pjud_verified: Boolean(lawyer.verified),
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
            availability_config: lawyer.availability ? (typeof lawyer.availability === 'object' ? lawyer.availability : undefined) : undefined,
            created_at: lawyer.created_at || undefined
          };
        });
        const newPage = page;
        const newPageSize = response.pageSize || 10;
        const newTotal = response.total || 0;
        const newHasMore = (newPage * newPageSize) < newTotal;
        // Update refs so infinite scroll can read without being reactive deps
        currentPageRef.current = newPage;
        hasMoreRef.current = newHasMore;
        setSearchResult(prev => ({
          lawyers: page === 1 ? formatted : [...prev.lawyers, ...formatted],
          total: newTotal,
          page: newPage,
          pageSize: newPageSize,
          hasMore: newHasMore
        }));
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar los abogados. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isSearching.current = false;
    }
  }, []);

  const SLUG_TO_CATEGORY: Record<string, string> = {
    "arriendo": "Derecho Arrendamiento",
    "laboral": "Derecho Laboral",
    "familia": "Derecho Familia",
    "penal": "Derecho Penal",
    "civil": "Derecho Civil",
    "consumidor": "Derecho del Consumidor",
  };

  // Sincronización URL -> estado + búsqueda.
  // IMPORTANTE: Este efecto SOLO depende de searchParams (la URL) y performSearch (estable).
  // Los estados locales se actualizan aquí como reflejo de la URL, pero NO son deps.
  // Actualizar la ref estable ANTES de llamar performSearch evita que el efecto de
  // carga infinita lea valores obsoletos.
  useEffect(() => {
    const urlQuery = searchParams.get('query') || '';
    const urlCategory = searchParams.get('category');
    const urlCategoria = searchParams.get('categoria');
    const urlSpecialties = searchParams.getAll('specialty');
    const urlLocation = searchParams.get('location') || '';
    const urlMinRating = Number(searchParams.get('minRating')) || 0;
    const urlMinExperience = Number(searchParams.get('minExperience')) || 0;
    const urlSort = searchParams.get('sort') || 'relevance';

    let newSpecialties: string[] = [];
    let categoryFromSlug: string | null = null;
    if (urlCategoria && SLUG_TO_CATEGORY[urlCategoria]) {
      categoryFromSlug = SLUG_TO_CATEGORY[urlCategoria];
    } else if (urlCategory && SLUG_TO_CATEGORY[urlCategory]) {
      categoryFromSlug = SLUG_TO_CATEGORY[urlCategory];
    }

    if (categoryFromSlug) {
      newSpecialties = [normalizeSpecialty(categoryFromSlug)];
    } else if (urlCategory) {
      newSpecialties = [normalizeSpecialty(urlCategory)];
    } else if (urlSpecialties.length > 0) {
      newSpecialties = [...new Set(urlSpecialties.map(normalizeSpecialty))];
    } else if (urlQuery) {
      const detected = detectEspecialidad(urlQuery);
      newSpecialties = detected ? [normalizeSpecialty(detected)] : ['all'];
    } else {
      newSpecialties = ['all'];
    }

    // Actualizar estados locales (para UI)
    setSearchTerm(urlQuery);
    setSelectedSpecialty(newSpecialties);
    setLocation(urlLocation);
    setMinRating(urlMinRating);
    setMinExperience(urlMinExperience);
    setSortBy(urlSort);

    // Actualizar ref estable PRIMERO para que el efecto de scroll pueda leer
    // los valores correctos sin ser dependencia reactiva de los estados.
    currentSearchParamsRef.current = {
      query: urlQuery,
      specialty: newSpecialties,
      location: urlLocation,
      minRating: urlMinRating,
      minExperience: urlMinExperience,
      availableNow: false,
      pageSize: 12,
    };
    // Resetear refs de paginación en cada nueva búsqueda
    currentPageRef.current = 1;
    hasMoreRef.current = true;

    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
    }
    setSearchResult(prev => ({ ...prev, page: 1, lawyers: [], hasMore: true }));
    performSearch({
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
      pageSize: 12
    });
  }, [searchParams, performSearch]);

  // Carga infinita.
  // CRÍTICO: Este efecto SOLO depende de inView, loading, loadingMore y performSearch.
  // Los parámetros de búsqueda y la paginación se leen desde refs estables para evitar
  // el loop que causaba 491 pageviews/usuario en /search.
  useEffect(() => {
    if (inView && !loading && !loadingMore && hasMoreRef.current) {
      const nextPage = currentPageRef.current + 1;
      const p = currentSearchParamsRef.current;
      performSearch({
        page: nextPage,
        isInitialLoad: false,
        searchParams: {
          query: p.query,
          specialty: p.specialty,
          location: p.location,
          minRating: p.minRating,
          minExperience: p.minExperience,
          availableNow: p.availableNow
        },
        pageSize: p.pageSize
      });
    }
  }, [inView, loading, loadingMore, performSearch]);

  // Scroll to sort section when coming from home search on mobile
  useEffect(() => {
    const scrollTo = searchParams.get('scrollTo');
    if (scrollTo === 'sort' && !hasScrolledToSort.current && !loading) {
      hasScrolledToSort.current = true;

      // Scroll to the sort section after a delay to ensure rendering
      setTimeout(() => {
        const sortSection = document.getElementById('sort-dropdown');
        if (sortSection) {
          const header = document.querySelector('div.fixed.top-0');
          const headerHeight = header ? header.offsetHeight : 104; // 104px = h-10 (top bar) + h-16 (header)
          const elementPosition = sortSection.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerHeight - 50; // 20px extra margin

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          // Remove the parameter from URL after scrolling
          const params = new URLSearchParams(searchParams);
          params.delete('scrollTo');
          setSearchParams(params);
        }
      }, 1500);
    }
  }, [searchParams, setSearchParams, loading]);

  // Handlers
  const { classify, isClassifying } = useLegalCategoryClassifier();

  const handleSearch = useCallback(async () => {
    if (isClassifying) return;
    const term = searchTerm.trim();
    if (!term) {
      setSearchParams(new URLSearchParams());
      return;
    }
    const params = new URLSearchParams();
    params.set('query', term);
    params.set('caso', term);

    let slug = "";
    let detectedCategory: string | null = null;
    if (term.length >= 10) {
      try {
        const result = await classify(term);
        slug = result.slug;
        detectedCategory = result.category;
      } catch {
        detectedCategory = detectEspecialidad(term);
        if (detectedCategory) {
          const fallbackSlugs: Record<string, string> = {
            "Derecho Arrendamiento": "arriendo",
            "Derecho Laboral": "laboral",
            "Derecho Familia": "familia",
            "Derecho Penal": "penal",
            "Derecho Civil": "civil",
            "Derecho del Consumidor": "consumidor",
          };
          slug = fallbackSlugs[detectedCategory] || "";
        }
      }
    } else {
      detectedCategory = detectEspecialidad(term);
      if (detectedCategory) {
        const fallbackSlugs: Record<string, string> = {
          "Derecho Arrendamiento": "arriendo",
          "Derecho Laboral": "laboral",
          "Derecho Familia": "familia",
          "Derecho Penal": "penal",
          "Derecho Civil": "civil",
          "Derecho del Consumidor": "consumidor",
        };
        slug = fallbackSlugs[detectedCategory] || "";
      }
    }

    if (slug) {
      params.set('categoria', slug);
      const mapped = SLUG_TO_CATEGORY[slug];
      if (mapped) {
        const normalized = normalizeSpecialty(mapped);
        if (normalized !== 'all') params.append('specialty', normalized);
      }
    } else if (detectedCategory) {
      const normalized = normalizeSpecialty(detectedCategory);
      if (normalized !== 'all') params.append('specialty', normalized);
    }

    if (location) params.set('location', location);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    setSearchParams(params);
  }, [searchTerm, location, sortBy, classify, isClassifying, setSearchParams]);

  const filteredLawyers = useMemo(() => {
    if (loading && !searchResult.lawyers.length) return [];
    const complete = searchResult.lawyers.filter(l => l.bio?.trim() && l.specialties?.length && l.location?.trim() && l.hourlyRate > 0);
    return [...complete].sort((a, b) => {
      // Check if either is Diego Donoso
      const aIsDiegoDonoso = a.name.toLowerCase().includes('diego') && a.name.toLowerCase().includes('donoso');
      const bIsDiegoDonoso = b.name.toLowerCase().includes('diego') && b.name.toLowerCase().includes('donoso');

      // If one is Diego Donoso and the other isn't, put Diego Donoso last
      if (aIsDiegoDonoso && !bIsDiegoDonoso) return 1;
      if (!aIsDiegoDonoso && bIsDiegoDonoso) return -1;

      const aPrice = a.consultationPrice || 0;
      const bPrice = b.consultationPrice || 0;
      if (aPrice === 0 && bPrice !== 0) return 1;
      if (aPrice !== 0 && bPrice === 0) return -1;
      if (sortBy === 'price_asc' || sortBy === 'price') return aPrice - bPrice;
      if (sortBy === 'price_desc') return bPrice - aPrice;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'reviews') return (b.reviews || 0) - (a.reviews || 0);
      if (sortBy === 'experience') return (b.experience_years || 0) - (a.experience_years || 0);
      const aV = Boolean(a.verified);
      const bV = Boolean(b.verified);
      if (aV !== bV) return aV ? -1 : 1;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [searchResult.lawyers, loading, sortBy]);

  const handleApplyFilters = useCallback((filters: any) => {
    setPriceRange(filters.priceRange);
    setAvailableNow(filters.availableNow);
    const params = new URLSearchParams(searchParams);
    if (filters.minExperience > 0) params.set('minExperience', filters.minExperience.toString());
    else params.delete('minExperience');
    if (filters.minRating > 0) params.set('minRating', filters.minRating.toString());
    else params.delete('minRating');
    if (filters.modality === 'presencial' && filters.region) params.set('location', filters.region);
    else if (filters.modality !== 'presencial') params.delete('location');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleSpecialtyChange = useCallback((specialties: string[]) => {
    const unique = [...new Set(specialties)];
    const params = new URLSearchParams(searchParams);
    params.delete('specialty');
    params.delete('category');
    params.delete('categoria');
    params.delete('caso');
    params.delete('query');
    unique.forEach(s => { if (s !== 'all') params.append('specialty', s); });
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // JSX (igual que antes, pero con los handlers actualizados)
  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Helmet><link rel="canonical" href="https://legalup.cl/search" /></Helmet>
      <Header />

      <div className="bg-white py-8 pt-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-2">
            <div className="w-full md:w-1/2">
              <h1 className="text-3xl font-bold font-serif text-gray-900">Elige tu abogado y agenda hoy</h1>
              <p className="text-gray-600">Consulta online de 60 minutos · Abogados verificados en PJUD</p>
            </div>
            <div className="w-full md:w-1/2">
              <PaymentMethods className="mt-0" />
            </div>
          </div>
          {/* <small className="text-xs text-gray-500">Abogados verificados en PJUD · Precios claros · Sin llamadas incómodas ni intermediarios</small> */}

          <div className="mt-6">
            <SearchBar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              location={location}
              onLocationChange={setLocation}
              onSearch={handleSearch}
              onFiltersClick={() => setShowFilters(true)}
              showMobileFilters={true}
              isLoading={isClassifying}
            />
          </div>

          <div className="mt-4 relative">
            <h4 className="text-lg font-semibold mb-4">¿Buscas alguna subespecialidad?</h4>
            <SpecialtiesSlider
              selectedSpecialty={selectedSpecialty}
              onSpecialtyChange={handleSpecialtyChange}
            />
            <div id="after-specialties" />
          </div>

          {(() => {
            const casoParam = searchParams.get('caso');
            const categoriaParam = searchParams.get('categoria');
            const displayCategoria = categoriaParam && SLUG_TO_CATEGORY[categoriaParam] ? SLUG_TO_CATEGORY[categoriaParam] : categoriaParam;
            if (!casoParam && !displayCategoria) return null;
            return (
              <div className="mt-6 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-900">
                {displayCategoria && casoParam ? (
                  <>Abogados de <strong>{displayCategoria}</strong> para tu caso: <em className="text-gray-700">“{decodeURIComponent(casoParam)}”</em></>
                ) : displayCategoria ? (
                  <>Filtrando por <strong>{displayCategoria}</strong></>
                ) : (
                  <>Buscando abogados para: <em className="text-gray-700">“{decodeURIComponent(casoParam || '')}”</em></>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <SearchFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        selectedSpecialty={selectedSpecialty}
        onSpecialtyChange={handleSpecialtyChange}
        sortBy={sortBy}
        onSortByChange={(newSort) => {
          const params = new URLSearchParams(searchParams);
          if (newSort !== 'relevance') params.set('sort', newSort);
          else params.delete('sort');
          setSearchParams(params);
        }}
        specialties={specialties}
        onApplyFilters={handleApplyFilters}
        onClearFilters={clearFilters}
      />

      <div className="bg-muted py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div id="filters-section" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="w-full md:flex-1">
              {(selectedSpecialty.some(s => s !== 'all') || location || minRating > 0 || minExperience > 0) ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-500">Filtros activos:</span>
                  {selectedSpecialty.filter(s => s !== 'all').map(spec => (
                    <div key={spec} className="inline-flex items-center gap-1 bg-gray-50 text-green-900 border border-green-600 hover:bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                      {spec}
                      <button onClick={() => handleSpecialtyChange(selectedSpecialty.filter(s => s !== spec).length ? selectedSpecialty.filter(s => s !== spec) : ['all'])} className="ml-1 text-green-500 hover:text-green-700">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {location && (
                    <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                      {location}
                      <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete('location'); setSearchParams(p); }} className="ml-1 text-blue-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {minRating > 0 && (
                    <div className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-100 hover:bg-yellow-100 px-3 py-1 rounded-full text-sm font-medium">
                      {minRating}+ estrellas
                      <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete('minRating'); setSearchParams(p); }} className="ml-1 text-yellow-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {minExperience > 0 && (
                    <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 px-3 py-1 rounded-full text-sm font-medium">
                      {minExperience}+ años exp.
                      <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete('minExperience'); setSearchParams(p); }} className="ml-1 text-purple-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <button onClick={clearFilters} className="text-sm text-green-900 hover:text-green-600 hover:underline ml-1">Limpiar todo</button>
                </div>
              ) : <div />}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto" id="sort-dropdown">
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                <label htmlFor="sort" className="text-sm text-gray-600 mr-2">Ordenar por:</label>
                <select id="sort" value={sortBy} onChange={(e) => {
                  const newSort = e.target.value;
                  const params = new URLSearchParams(searchParams);
                  if (newSort !== 'relevance') params.set('sort', newSort);
                  else params.delete('sort');
                  setSearchParams(params);
                }} className="h-10 w-full sm:w-48 pl-3 pr-10 text-sm border border-gray-300 rounded-md bg-white">
                  <option value="relevance">Recomendados</option>
                  <option value="rating">Mejor calificados</option>
                  <option value="experience">Experiencia</option>
                  <option value="price">Precio</option>
                </select>
              </div>
              <Button variant="outline" className="w-full sm:w-auto border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-2" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal className="h-4 w-4" /> Filtros
              </Button>
            </div>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"><p className="font-medium">Error:</p><p>{error}</p></div>}

          {loading && searchResult.lawyers.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6 min-h-[300px]">
                  <div className="flex items-start gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-6 w-100" /><div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div><Skeleton className="h-4 w-1/2" /></div></div>
                  <div className="mt-4 flex flex-wrap gap-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}</div>
                  <div className="mt-4 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" /></div>
                  <div className="mt-6"><Skeleton className="h-10 w-full rounded-md" /></div>
                </div>
              ))}
            </div>
          ) : filteredLawyers.length > 0 ? (
            <div className="w-full" id="lawyer-cards-section">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredLawyers.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} user={user} />)}
              </div>
              {(loading || loadingMore) && <div className="flex justify-center py-8"><div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div></div>}
              <div ref={loadMoreRef} className="h-1 w-full" />
            </div>
          ) : !loading && searchResult.lawyers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <div className="mx-auto h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mb-4"><Search className="h-8 w-8 text-green-600" /></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron abogados</h3>
              <p className="text-gray-500 mb-6">No hay resultados que coincidan con tu búsqueda. Intenta con otros términos o ajusta los filtros.</p>
              <Button variant="outline" onClick={clearFilters} className="border-green-900 text-gray-900 hover:bg-green-900 hover:text-white">Limpiar filtros</Button>
            </div>
          ) : null}
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} mode={authMode} onModeChange={setAuthMode} />
    </div>
  );
};

export default SearchResults;