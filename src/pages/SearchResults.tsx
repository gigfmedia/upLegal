import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { detectEspecialidad } from "@/utils/askLLM";
import SpecialtiesSlider from '@/components/search/SpecialtiesSlider';

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
  if (lower.includes('inmobiliario') || lower.includes('arriendo') || lower.includes('arrendamiento')) return 'Derecho Civil';
  if (lower.includes('comercial')) return 'Derecho Comercial';
  if (lower.includes('tributario')) return 'Derecho Tributario';
  if (lower.includes('civil')) return 'Derecho Civil';
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
    pageSize: 12,
    hasMore: true
  });

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);

  // Infinite scroll ref
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Function to perform search
  const performSearch = async (params: {
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
    if (isSearching.current) {
      return;
    }

    const { page, isInitialLoad, searchParams, currentPageSize } = params;

    const safeSearchParams = searchParams || {
      query: '',
      specialty: ['all'],
      location: '',
      minRating: 0,
      minExperience: 0,
      availableNow: false
    };

    const { query, specialty, location, minRating, minExperience, availableNow } = safeSearchParams;

    try {
      isSearching.current = true;

      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

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
        pageSize: currentPageSize
      });

      if (response && response.lawyers) {
        const formattedLawyers = response.lawyers.map(lawyer => {
          const clientSurchargePercent = 0.1;
          const roundToThousands = (amount: number): number => {
            return Math.round(amount / 1000) * 1000;
          };

          const rawHourlyRate = lawyer.hourly_rate_clp || 0;
          const displayHourlyRate = roundToThousands(rawHourlyRate * (1 + clientSurchargePercent));

          // Safe availability parsing
          let availabilityConfig = undefined;
          if (lawyer.availability) {
            if (typeof lawyer.availability === 'object') {
              availabilityConfig = lawyer.availability;
            } else if (typeof lawyer.availability === 'string' && lawyer.availability.trim() !== '') {
              try {
                if (lawyer.availability.trim().startsWith('{') || lawyer.availability.trim().startsWith('[')) {
                  availabilityConfig = JSON.parse(lawyer.availability);
                }
              } catch (e) {
                // Silently fail
              }
            }
          }

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
            location: lawyer.location && lawyer.location.trim() !== '' ? lawyer.location : '',
            cases: 0,
            hourlyRate: rawHourlyRate,
            hourly_rate_clp: rawHourlyRate,
            consultationPrice: displayHourlyRate,
            contact_fee_clp: displayHourlyRate,
            image: lawyer.avatar_url || '',
            avatar_url: lawyer.avatar_url || '',
            bio: lawyer.bio && typeof lawyer.bio === 'string' && lawyer.bio.trim() !== '' ? lawyer.bio : 'Este abogado no ha proporcionado una biografía.',
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
            availability_config: availabilityConfig
          };
        });

        setSearchResult(prev => ({
          lawyers: page === 1 ? formattedLawyers : [...prev.lawyers, ...formattedLawyers],
          total: response.total || 0,
          page,
          pageSize: response.pageSize || 10,
          hasMore: (page * (response.pageSize || 10)) < (response.total || 0)
        }));
      }
    } catch (err) {
      console.error('Error loading lawyers:', err);
      setError('Error al cargar los abogados. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isSearching.current = false;
    }
  };

  // Function to perform initial search
  const performInitialSearch = useCallback(() => {
    const urlQuery = searchParams.get('query') || '';
    const urlCategory = searchParams.get('category');
    const urlSpecialties = searchParams.getAll('specialty');
    const urlLocation = searchParams.get('location') || '';
    const urlMinRating = Number(searchParams.get('minRating')) || 0;
    const urlMinExperience = Number(searchParams.get('minExperience')) || 0;

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

    setSearchResult(prev => ({
      ...prev,
      page: 1,
      lawyers: [],
      hasMore: true
    }));

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
      currentPageSize: 12
    });
  }, [searchParams]);

  // Initial load - only once
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      performInitialSearch();
    }
  }, [performInitialSearch]);

  // Sync URL changes to local state
  useEffect(() => {
    const urlQuery = searchParams.get('query') || '';
    const urlCategory = searchParams.get('category');
    const urlSpecialties = searchParams.getAll('specialty');
    const urlLocation = searchParams.get('location') || '';
    const urlMinRating = Number(searchParams.get('minRating')) || 0;
    const urlMinExperience = Number(searchParams.get('minExperience')) || 0;
    const urlSort = searchParams.get('sort') || 'relevance';

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

    setSearchTerm(urlQuery);
    setSelectedSpecialty(newSpecialties);
    setLocation(urlLocation);
    setMinRating(urlMinRating);
    setMinExperience(urlMinExperience);
    setSortBy(urlSort);

    if (initialLoadDone.current && (urlQuery !== searchTerm || urlLocation !== location)) {
      setSearchResult(prev => ({
        ...prev,
        page: 1,
        lawyers: [],
        hasMore: true
      }));

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
        currentPageSize: 12
      });
    }
  }, [searchParams]);

  // Load more when scroll reaches the bottom
  useEffect(() => {
    if (inView && !loading && !loadingMore && searchResult.hasMore && searchResult.lawyers.length > 0) {
      const nextPage = searchResult.page + 1;
      performSearch({
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
  }, [inView, loading, loadingMore, searchResult.hasMore, searchResult.page, searchResult.pageSize, searchTerm, selectedSpecialty, location, minRating, minExperience, searchResult.lawyers.length]);

  // Handle search
  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();

    if (!searchTerm.trim()) {
      setSearchParams(new URLSearchParams());
      return;
    }

    const detected = detectEspecialidad(searchTerm);
    if (detected) {
      const normalizedDetected = normalizeSpecialty(detected);
      if (!selectedSpecialty.includes(normalizedDetected)) {
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

    if (searchTerm.trim()) {
      params.set('query', searchTerm.trim());
    }

    if (location) params.set('location', location);
    if (sortBy !== 'relevance') params.set('sort', sortBy);

    setSearchParams(params);
  }, [searchTerm, selectedSpecialty, location, sortBy, setSearchParams]);

  // Get the lawyers from the search result
  const filteredLawyers = useMemo(() => {
    if (loading && !searchResult.lawyers.length) {
      return [];
    }

    if (searchResult.lawyers.length === 0) {
      return [];
    }

    // Filter out incomplete lawyers (missing bio, specialties, location, or hourly rate)
    const completeLawyers = searchResult.lawyers.filter(lawyer => 
      Boolean(
        lawyer.bio?.trim() && 
        lawyer.specialties?.length > 0 && 
        lawyer.location?.trim() && 
        lawyer.hourlyRate > 0
      )
    );

    return [...completeLawyers].sort((a, b) => {
      const aPrice = a.consultationPrice || 0;
      const bPrice = b.consultationPrice || 0;

      if (aPrice === 0 && bPrice !== 0) return 1;
      if (aPrice !== 0 && bPrice === 0) return -1;

      if (sortBy === 'price_asc' || sortBy === 'price') {
        if (aPrice !== bPrice) return aPrice - bPrice;
      } else if (sortBy === 'price_desc') {
        if (aPrice !== bPrice) return bPrice - aPrice;
      } else if (sortBy === 'rating') {
        const diff = (b.rating || 0) - (a.rating || 0);
        if (diff !== 0) return diff;
      } else if (sortBy === 'reviews') {
        const diff = (b.reviews || 0) - (a.reviews || 0);
        if (diff !== 0) return diff;
      } else if (sortBy === 'experience') {
        const diff = (b.experience_years || 0) - (a.experience_years || 0);
        if (diff !== 0) return diff;
      }

      const aVerified = Boolean(a.verified);
      const bVerified = Boolean(b.verified);
      if (aVerified !== bVerified) return aVerified ? -1 : 1;

      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;

      return (b.reviews || 0) - (a.reviews || 0);
    });
  }, [searchResult.lawyers, loading, sortBy]);

  // Handle applying filters
  const handleApplyFilters = useCallback((filters: {
    priceRange: [number, number];
    minRating: number;
    minExperience: number;
    availableNow: boolean;
    modality?: string;
    region?: string;
  }) => {
    setPriceRange(filters.priceRange);
    setMinRating(filters.minRating);
    setMinExperience(filters.minExperience);
    setAvailableNow(filters.availableNow);

    setSearchParams(prev => {
      const params = new URLSearchParams(prev);

      if (filters.minExperience > 0) {
        params.set('minExperience', filters.minExperience.toString());
      } else {
        params.delete('minExperience');
      }

      if (filters.minRating > 0) {
        params.set('minRating', filters.minRating.toString());
      } else {
        params.delete('minRating');
      }

      if (filters.modality === 'presencial' && filters.region) {
        params.set('location', filters.region);
      } else if (filters.modality !== 'presencial') {
        params.delete('location');
      }

      return params;
    });
  }, [setSearchParams]);

  // Handle specialty change from filters
  const handleSpecialtyChange = useCallback((specialties: string[]) => {
    setSelectedSpecialty(specialties);

    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.delete('specialty');
      params.delete('category');

      specialties.forEach(s => {
        if (s !== 'all') params.append('specialty', s);
      });

      return params;
    });
  }, [setSearchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedSpecialty(['all']);
    setLocation('');
    setMinRating(0);
    setMinExperience(0);
    setAvailableNow(false);
    setPriceRange([0, 1000000]);
    setSortBy('relevance');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Scroll to lawyer cards when coming from category click
  useEffect(() => {
    const hasCategoryParam = searchParams.get('category');

    if (hasCategoryParam && !loading && filteredLawyers.length > 0) {
      setTimeout(() => {
        const afterSpecialties = document.getElementById('after-specialties');
        if (afterSpecialties) {
          const isMobile = window.innerWidth < 768;
          const offset = isMobile ? 80 : 0;
          const elementPosition = afterSpecialties.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: elementPosition - offset,
            behavior: 'smooth'
          });
        }
      }, 150);
    }
  }, [loading, filteredLawyers.length, searchParams]);

  // GA4 tracking
  useEffect(() => {
    if (loading) return;
    if (filteredLawyers.length === 0) return;

    const now = Date.now();
    const trackingKey = `${searchParams.toString()}|${filteredLawyers.length}`;

    if (viewLawyersTrackedRef.current?.key === trackingKey) {
      if (now - viewLawyersTrackedRef.current.timestamp < 2000) {
        return;
      }
    }

    viewLawyersTrackedRef.current = {
      key: trackingKey,
      timestamp: now
    };

    const specialty = selectedSpecialty?.length
      ? selectedSpecialty.filter((s) => s !== 'all').join(',') || 'all'
      : 'all';

    setTimeout(() => {
      if (window.gtag) {
        window.gtag('event', 'view_lawyers', {
          results_count: filteredLawyers.length,
          specialty,
        });
      }
    }, 100);
  }, [loading, filteredLawyers.length, searchParams, selectedSpecialty]);

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
            <SpecialtiesSlider
              selectedSpecialty={selectedSpecialty}
              onSpecialtyChange={handleSpecialtyChange}
            />
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
              {(selectedSpecialty.some(s => s !== 'all') || location || minRating > 0 || minExperience > 0) ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-500">Filtros activos:</span>
                  {selectedSpecialty.filter(s => s !== 'all').map((specialty) => (
                    <div key={specialty} className="inline-flex items-center gap-1 bg-gray-50 text-green-900 border border-green-600 hover:bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                      {specialty}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newSpecialties = selectedSpecialty.filter(s => s !== specialty);
                          const updatedSpecialties = newSpecialties.length > 0 ? newSpecialties : ['all'];
                          setSelectedSpecialty(updatedSpecialties);
                          setSearchParams(prevParams => {
                            const params = new URLSearchParams(prevParams);
                            params.delete('specialty');
                            params.delete('category');
                            if (updatedSpecialties[0] !== 'all') {
                              updatedSpecialties.forEach(s => {
                                if (s && s !== 'all') {
                                  params.append('specialty', s);
                                }
                              });
                            }
                            return params;
                          });
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
                          setLocation('');
                          setSearchParams((prevParams) => {
                            const params = new URLSearchParams(prevParams);
                            params.delete('location');
                            return params;
                          });
                        }}
                        className="ml-1 text-blue-500 hover:text-blue-700 rounded-full focus:outline-none hover:bg-blue-200 p-0.5 transition-colors"
                        type="button"
                        aria-label="Remover filtro de ubicación"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {minRating > 0 && (
                    <div className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-100 hover:bg-yellow-100 px-3 py-1 rounded-full text-sm font-medium">
                      {minRating}+ estrellas
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMinRating(0);
                          setSearchParams((prevParams) => {
                            const params = new URLSearchParams(prevParams);
                            params.delete('minRating');
                            return params;
                          });
                        }}
                        className="ml-1 text-yellow-500 hover:text-yellow-700 rounded-full focus:outline-none hover:bg-yellow-200 p-0.5 transition-colors"
                        type="button"
                        aria-label="Remover filtro de calificación"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {minExperience > 0 && (
                    <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 px-3 py-1 rounded-full text-sm font-medium">
                      {minExperience}+ años exp.
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMinExperience(0);
                          setSearchParams((prevParams) => {
                            const params = new URLSearchParams(prevParams);
                            params.delete('minExperience');
                            return params;
                          });
                        }}
                        className="ml-1 text-purple-500 hover:text-purple-700 rounded-full focus:outline-none hover:bg-purple-200 p-0.5 transition-colors"
                        type="button"
                        aria-label="Remover filtro de experiencia"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {(selectedSpecialty[0] !== 'all' || location || minRating > 0 || minExperience > 0) && (
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
                    const newSort = e.target.value;
                    setSortBy(newSort);
                    const params = new URLSearchParams(searchParams);
                    if (newSort !== 'relevance') {
                      params.set('sort', newSort);
                    } else {
                      params.delete('sort');
                    }
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

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

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
                          <Skeleton className="h-6 w-100" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[...Array(2)].map((_, i) => (
                          <Skeleton key={i} className="h-6 w-20 rounded-full" />
                        ))}
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
          ) : filteredLawyers.length > 0 ? (
            <div className="w-full" id="lawyer-cards-section">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
                {filteredLawyers.map((lawyer) => (
                  <LawyerCard
                    key={lawyer.id}
                    lawyer={lawyer}
                    user={user}
                  />
                ))}
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
          ) : !loading && searchResult.lawyers.length === 0 ? (
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
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={(mode) => setAuthMode(mode)}
      />
    </div>
  );
};

export default SearchResults;