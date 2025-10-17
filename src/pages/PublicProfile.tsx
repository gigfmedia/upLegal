import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useToast } from "@/components/ui/use-toast";
import Header from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ContactModal } from "@/components/ContactModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import { ServicesSection } from "@/components/ServicesSection";
import { AuthModal } from "@/components/AuthModal";
import { 
  Star, 
  MapPin, 
  ShieldCheck,
  MessageSquare, 
  Calendar,
  Scale,
  Clock,
  User,
  Briefcase,
  MessageCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Minus,
  Check,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Linkedin,
  FileText,
  AlertCircle,
  ThumbsUp,
  Eye,
  Building2,
  DollarSign,
  CheckCircle,
  Heart
} from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";

interface PublicProfileProps {
  userData?: {
    id?: string;
    profileViews: number;
  };
}

interface ServiceType {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number;
  price_clp: number;
  duration?: number | string;
  delivery_time: string; // Made required since we provide a default
  features: string[] | string;
  available: boolean;
  lawyer_id?: string;
  lawyer_user_id?: string;
  created_at?: string;
  updated_at?: string;
  originalTitle: string; // Required for sorting
  [key: string]: unknown; // Allow additional properties
}

interface Availability {
  available_today?: boolean;
  available_this_week?: boolean;
  quick_response?: boolean;
  emergency_consultations?: boolean;
  [key: string]: unknown;
}

interface LawyerProfile {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  hasBio?: boolean;
  services?: ServiceType[];
  available_today?: boolean;
  available_this_week?: boolean;
  quick_response?: boolean;
  emergency_consultations?: boolean;
  profile_views?: number;
  location?: string;
  specialties?: string | string[] | null;
  hourly_rate_clp?: number | null;
  rating?: number | null;
  review_count?: number;
  experience_years?: number | null;
  verified?: boolean;
  languages?: string[] | null;
  availability?: Availability | string | null;
  education?: string;
  university?: string;
  study_start_year?: string | number | null;
  study_end_year?: string | number | null;
  [key: string]: unknown; // For any additional properties
}

// Extended type that includes profile_views
interface LawyerWithViews extends Omit<LawyerProfile, 'profile_views'> {
  profile_views?: number;
}

const PublicProfile = ({ userData: propUser }: PublicProfileProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lawyer, setLawyer] = useState<LawyerWithViews | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authAction, setAuthAction] = useState<(() => void) | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const { toast } = useToast();
  
  // Memoize the handleServiceAction function to prevent unnecessary re-renders
  const handleServiceAction = useCallback((actionType: 'contact' | 'schedule', serviceItem?: ServiceType) => {
    if (!serviceItem) return;
    
    if (!currentUser) {
      // Store the intended action to perform after login
      const pendingAction = {
        type: actionType,
        serviceId: serviceItem.id,
        lawyerId: id,
        service: {
          id: serviceItem.id,
          name: serviceItem.name || '',
          title: serviceItem.title || '',
          description: serviceItem.description || '',
          price: serviceItem.price || 0,
          price_clp: serviceItem.price_clp || 0,
          delivery_time: serviceItem.delivery_time || '',
          features: Array.isArray(serviceItem.features) ? serviceItem.features : [],
          available: serviceItem.available !== false
        }
      };
      
      sessionStorage.setItem('pendingAction', JSON.stringify(pendingAction));
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    
    if (actionType === 'contact') {
      setSelectedService(serviceItem);
      setIsContactModalOpen(true);
    } else if (actionType === 'schedule') {
      setSelectedService(serviceItem);
      setIsScheduleModalOpen(true);
    } else if (actionType === 'book' && serviceItem) {
      handleBookService(serviceItem);
    }
  }, [currentUser, id, setAuthMode, setIsAuthModalOpen, setSelectedService, setIsContactModalOpen, setIsScheduleModalOpen]);

  // Handle pending actions after login
  useEffect(() => {
    if (currentUser) {
      const pendingAction = sessionStorage.getItem('pendingAction');
      if (pendingAction) {
        try {
          const action = JSON.parse(pendingAction);
          if (action.service) {
            if (action.type === 'contact') {
              handleServiceAction('contact', action.service);
            } else if (action.type === 'schedule') {
              handleServiceAction('schedule', action.service);
            }
          }
        } catch (error) {
          console.error('Error processing pending action:', error);
        } finally {
          sessionStorage.removeItem('pendingAction');
        }
      }
    }
  }, [currentUser, handleServiceAction]);

  // Type guard to check if an object is a valid service
  const isValidService = (service: unknown): service is ServiceType => {
    return (
      typeof service === 'object' && 
      service !== null && 
      'id' in service &&
      typeof service.id === 'string'
    );
  };

  // Handle service selection with proper type safety
  const handleServiceSelect = (service: ServiceType) => {
    if (service && typeof service === 'object' && 'id' in service) {
      setSelectedService(service);
    }
  };

  // Handle authentication required for actions
  const handleAuthRequired = (action: 'contact' | 'schedule' | 'book' | 'service', service?: ServiceType) => {
    // Store the pending action in session storage
    const pendingAction = { action, service };
    sessionStorage.setItem('pendingAction', JSON.stringify(pendingAction));

    if (!currentUser) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      setAuthAction(() => () => {
        // This will be called after successful login
        if (action === 'contact' && service) {
          // Handle contact after auth
        } else if (action === 'schedule') {
          setIsScheduleModalOpen(true);
        } else if (action === 'book' && service) {
          handleBookService(service);
        }
      });
      return;
    }

    // If user is already authenticated, perform the action directly
    if (action === 'contact' && service) {
      // Handle contact
    } else if (action === 'schedule') {
      setIsScheduleModalOpen(true);
    } else if (action === 'book' && service) {
      handleBookService(service);
    }
  };

  const handleBookService = (service: ServiceType) => {
    setSelectedService(service);
    setIsScheduleModalOpen(true);
  };

  // Parse features from string or array
  const parseFeatures = useCallback((features: string | string[] | null | undefined): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) {
      return features.filter((f): f is string => typeof f === 'string');
    }
    if (typeof features === 'string') {
      return features.split('\n').filter(Boolean);
    }
    return [];
  }, []);

    // Define a type for the raw profile data from the API
  interface RawProfileData {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    phone?: string;
    website?: string;
    specialties?: string | string[] | null;
    hourly_rate_clp?: number | null;
    rating?: number | null;
    review_count?: number;
    experience_years?: number | null;
    verified?: boolean;
    languages?: string[] | null;
    availability?: string | Availability | null;
    services?: ServiceType[] | null;
    education?: string;
    university?: string;
    study_start_year?: string | number | null;
    study_end_year?: string | number | null;
    [key: string]: unknown;
  }

  // Helper function to safely convert unknown to string
  const safeToString = (value: unknown, defaultValue: string = ''): string => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string') return value || defaultValue;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : defaultValue;
    try {
      const str = JSON.stringify(value);
      return str === '{}' || str === '[]' ? defaultValue : str;
    } catch {
      return defaultValue;
    }
  };

  // Update the lawyer state with the fetched data
  const updateLawyerState = useCallback((profile: RawProfileData) => {
    if (!profile) return;
    
    // Parse availability with better error handling and fallbacks
    let availability: Availability = {
      available_today: false,
      available_this_week: false,
      quick_response: false,
      emergency_consultations: false
    };

    try {
      if (profile.availability) {
        if (typeof profile.availability === 'string') {
          // Try to parse the string as JSON
          try {
            const parsed = JSON.parse(profile.availability);
            if (parsed && typeof parsed === 'object') {
              availability = {
                ...availability,
                ...parsed
              };
            }
          } catch (e) {
            console.warn('Failed to parse availability JSON, using default values');
          }
        } else if (typeof profile.availability === 'object') {
          // If it's already an object, use it directly
          availability = {
            ...availability,
            ...(profile.availability as Availability)
          };
        }
      }
    } catch (e) {
      console.error('Error processing availability:', e);
      // Continue with default values if there's an error
    }

    // Ensure specialties is properly typed
    const specialties = Array.isArray(profile.specialties) 
      ? profile.specialties 
      : typeof profile.specialties === 'string' 
        ? [profile.specialties] 
        : [];

    // Create a properly typed lawyer object
    const lawyerProfile: LawyerProfile = {
      ...profile,
      id: profile.id || '',
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      availability,
      hasBio: !!profile.bio,
      specialties,
      // Ensure all required fields have default values
      user_id: profile.user_id || profile.id || '',
      display_name: profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Abogado',
      rating: typeof profile.rating === 'number' ? profile.rating : null,
      review_count: typeof profile.review_count === 'number' ? profile.review_count : 0,
      hourly_rate_clp: typeof profile.hourly_rate_clp === 'number' ? profile.hourly_rate_clp : null,
      experience_years: typeof profile.experience_years === 'number' ? profile.experience_years : null,
      verified: !!profile.verified,
      languages: Array.isArray(profile.languages) ? profile.languages : [],
      education: profile.education || 'Derecho',
      university: profile.university || 'Universidad de Chile',
      study_start_year: profile.study_start_year || 2010,
      study_end_year: profile.study_end_year || 2016,
    };

    setLawyer(lawyerProfile);
  }, []);

  // Debug: Log the lawyer object when it changes
  useEffect(() => {
    //console.log('Lawyer data:', lawyer);
  }, [lawyer]);

  // Fetch profile data when component mounts
  const fetchProfile = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      // Fetch profile by ID or user_id
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${id},user_id.eq.${id}`)
        .single();
        
      if (error) throw error;
      
      // Debug: Log the raw profile data
      //console.log('Raw profile data:', JSON.stringify(profile, null, 2));
      
      // Update lawyer state with profile data
      updateLawyerState(profile);
      
      // Fetch services for this lawyer
      
      const { data: servicesData, error: servicesError } = await supabase
        .from('lawyer_services')
        .select('*')
        .eq('lawyer_user_id', profile.user_id || profile.id);
      
      if (servicesError) {
        throw servicesError;
      }
      
      // If no services, set empty array
      if (!servicesData || servicesData.length === 0) {
        setServices([]);
        return;
      }
      
      // Define service order for sorting
      const serviceOrder = [
        'consulta',
        'asesoría',
        'revisión',
        'contrato',
        'demanda',
        'defensa',
        'representación',
        'acompañamiento'
      ];

      // Define a type for the service data from the API
      interface ServiceData {
        id: string;
        title: string;
        description?: string;
        price?: number | string;
        price_clp?: number | string | null;
        features?: string | string[] | null;
        duration?: number | string;
        delivery_time?: string;
        available?: boolean;
        [key: string]: unknown;
      }

      // Map and sort services
      const formattedServices = servicesData
        .filter((service: unknown): service is ServiceData => 
          typeof service === 'object' && 
          service !== null && 
          'id' in service && 
          typeof service.id === 'string' &&
          'title' in service &&
          typeof service.title === 'string'
        )
        .map((service: ServiceData) => {
          // Parse features from string or array
          let features: string[] = [];
          if (Array.isArray(service.features)) {
            features = service.features.filter((f): f is string => typeof f === 'string');
          } else if (typeof service.features === 'string') {
            try {
              // Try to parse as JSON if it's a stringified array
              const parsed = JSON.parse(service.features);
              features = Array.isArray(parsed) ? parsed : [String(service.features)];
            } catch {
              // If not valid JSON, split by newline
              features = service.features.split('\n').filter(Boolean);
            }
          }
          
          // Format delivery time - check if it's a number or 'variable'
          let deliveryTime: string = 'A convenir';
          if (typeof service.delivery_time === 'string') {
            const dt = service.delivery_time.trim();
            if (dt.toLowerCase() === 'variable') {
              deliveryTime = 'variable';
            } else if (/^\d+$/.test(dt)) {
              deliveryTime = `${dt} días`;
            } else if (dt) {
              deliveryTime = dt;
            }
          }

          // Create the service object with all required fields
          const serviceObj: ServiceType = {
            id: service.id,
            name: service.title,
            title: service.title,
            description: service.description || '',
            price: typeof service.price === 'number' ? service.price : 0,
            price_clp: Number(service.price_clp) || 0,
            duration: service.duration || '',
            delivery_time: deliveryTime,
            features: features,
            available: service.available !== false,
            originalTitle: service.title.toLowerCase(),
            // Add optional fields if they exist
            ...('lawyer_id' in service ? { lawyer_id: String(service.lawyer_id) } : {}),
            ...('lawyer_user_id' in service ? { lawyer_user_id: String(service.lawyer_user_id) } : {}),
            ...('created_at' in service ? { created_at: String(service.created_at) } : {}),
            ...('updated_at' in service ? { updated_at: String(service.updated_at) } : {})
          };
          
          return serviceObj;
        })
        .sort((a, b) => {
          const aTitle = a.originalTitle || '';
          const bTitle = b.originalTitle || '';
          
          // Get the index in the order array, or a large number if not found (will be sorted to the end)
          const aIndex = serviceOrder.findIndex(title => aTitle.includes(title));
          const bIndex = serviceOrder.findIndex(title => bTitle.includes(title));
          
          // If both are in the order array, sort by their position
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          // If only a is in the order array, it comes first
          if (aIndex !== -1) return -1;
          // If only b is in the order array, it comes first
          if (bIndex !== -1) return 1;
          
          // If neither is in the order array, maintain their relative order
          return 0;
        });
      
      setServices(formattedServices);
      setLoading(false);
    } catch (error) {
      setError('Error al cargar el perfil');
      setLoading(false);
    }
  }, [id, updateLawyerState]);

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id, fetchProfile]);

  // Extend the LawyerProfile type to include profile_views
  interface LawyerWithViews extends Omit<LawyerProfile, 'profile_views'> {
    profile_views?: number;
  }
  
  // Type assertion for the lawyer data
  const lawyerWithViews = lawyer as LawyerWithViews | null;

  // Format data for display
  const profileData = useMemo(() => {
    const lawyerWithViews = lawyer as LawyerWithViews | null;
    
    // Format education information if available
    const education = [];
    if (lawyerWithViews?.education) {
      let educationStr = lawyerWithViews.education;
      if (lawyerWithViews.university) {
        educationStr += `, ${lawyerWithViews.university}`;
      }
      if (lawyerWithViews.study_start_year || lawyerWithViews.study_end_year) {
        const startYear = lawyerWithViews.study_start_year || 'Año';
        const endYear = lawyerWithViews.study_end_year || 'Año';
        educationStr += ` (${startYear} - ${endYear})`;
      }
      education.push(educationStr);
    } else {
      education.push('Título en Derecho');
    }
    
    return {
      hourlyRate: lawyerWithViews?.hourly_rate_clp || 0,
      specialties: lawyerWithViews?.specialties || [],
      location: lawyerWithViews?.location || 'Ubicación no especificada',
      bio: lawyerWithViews?.bio || 'Este abogado no ha proporcionado una biografía.',
      education: education,
      experience: [
        `Abogado con ${lawyerWithViews?.experience_years || 0} años de experiencia`
      ],
      certifications: lawyerWithViews?.certifications 
        ? (typeof lawyerWithViews.certifications === 'string' 
            ? lawyerWithViews.certifications.split('\n').filter(cert => cert.trim() !== '')
            : Array.isArray(lawyerWithViews.certifications) 
              ? lawyerWithViews.certifications 
              : [])
        : [],
      languages: lawyerWithViews?.languages || ["Español"],
      availability: "Disponible",
      responseTime: "< 2 horas",
      completionRate: "98%",
      recentWork: [
        {
          title: "Asesoría Legal",
          description: "Asesoría legal personalizada a clientes particulares y empresas.",
          date: "Reciente",
          rating: 5
        },
        {
          title: "Defensa Penal",
          description: "Representación exitosa en casos penales complejos.",
          date: "Último mes",
          rating: 4
        }
      ],
      profile_views: lawyerWithViews?.profile_views || 0
    };
  }, [lawyer]);

  // Debug logs removed for production

  // Format price in CLP with proper type safety
  const formatPrice = (price: unknown): string => {
    // Handle null or undefined
    if (price === null || price === undefined) {
      return 'Precio no disponible';
    }
    
    // Convert to number if it's a string
    let priceNum: number;
    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      if (isNaN(parsed)) return 'Precio no disponible';
      priceNum = parsed;
    } else if (typeof price === 'number') {
      if (isNaN(price)) return 'Precio no disponible';
      priceNum = price;
    } else if (typeof price === 'bigint') {
      priceNum = Number(price);
    } else {
      return 'Precio no disponible';
    }
    
    // Format the price as CLP
    try {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(priceNum);
    } catch (error) {
      console.error('Error formatting price:', error);
      return `${priceNum} CLP`; // Fallback format if Intl fails
    }
  };

  // Skeleton component for the profile header
  const ProfileHeaderSkeleton = () => (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-col items-center">
            <div className="relative h-28 w-28 md:h-32 md:w-32 mb-4 rounded-full ring-4 ring-white shadow-md overflow-hidden">
              <Skeleton className="h-full w-full rounded-full" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 mr-1" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-20 ml-1" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-1" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center">
                  <Skeleton className="h-4 w-4 mr-1" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="h-4 w-4 mr-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="h-4 w-4 mr-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          
          <div className="md:pl-6 md:ml-6 md:border-l-2 md:border-gray-200 w-full md:w-64 lg:w-72 mt-6 md:mt-0 flex-shrink-0">
            <Skeleton className="h-10 w-40 mb-4" />
            <div className="space-y-3 w-full">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Skeleton component for the about section
  const AboutSectionSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="space-y-6">
            <div>
              <Skeleton className="h-5 w-24 mb-3" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            
            <div>
              <Skeleton className="h-5 w-24 mb-3" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
          
          <div>
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Skeleton component for the experience section
  const ExperienceSectionSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-l-2 border-blue-200 pl-4">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Skeleton component for the reviews section
  const ReviewsSectionSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="flex justify-between items-start mb-2">
                <Skeleton className="h-5 w-48" />
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Skeleton key={star} className="h-4 w-4 rounded-full mx-0.5" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-20 mt-3" />
              {i < 2 && <Separator className="mt-6" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Skeleton component for the services section
  const ServicesSectionSkeleton = () => (
    <Card className="border shadow-sm">
      <CardHeader className="p-6">
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
          <Skeleton className="h-7 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {[1, 2].map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((col, colIndex) => (
                <div key={`${rowIndex}-${colIndex}`} className="border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-5 w-32 mb-4" />
                  <div className="space-y-3 mb-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center">
                        <Skeleton className="h-4 w-4 rounded-full mr-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex items-center">
                      <Skeleton className="h-4 w-4 mr-2" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="bg-muted pt-24 px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <ProfileHeaderSkeleton />
            <AboutSectionSkeleton />
            <ExperienceSectionSkeleton />
            <ReviewsSectionSkeleton />
            <ServicesSectionSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-3 text-lg font-medium text-gray-900">Error al cargar el perfil</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <Button 
            onClick={() => fetchProfile()} 
            className="mt-4"
            variant="outline"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="bg-muted pt-24 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {/* Profile Header */}
            <Card className="overflow-hidden shadow-sm relative">
              <CardContent className="p-6 md:p-8">
                {/* Mobile favorite button */}
                {lawyer && (
                  <div className="absolute top-4 right-4 sm:hidden z-10">
                    <FavoriteButton 
                      lawyerId={lawyer.id} 
                      showText={false}
                      onAuthRequired={() => setIsAuthModalOpen(true)}
                      className="text-gray-500 hover:text-red-500 hover:bg-gray-50 rounded-full p-2"
                    />
                  </div>
                )}
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center relative">
                      {/* Mobile-only verified badge */}
                      {(lawyer?.verified || lawyer?.pjud_verified) && (
                        <div className="sm:hidden absolute -top-1 -left-1 z-10">
                          <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <ShieldCheck className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-green-700">
                              {lawyer?.pjud_verified ? 'Verificado PJUD' : 'Verificado'}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="relative h-28 w-28 md:h-32 md:w-32 mb-4 rounded-full ring-4 ring-white shadow-md overflow-hidden">
                        <Avatar className="h-full w-full">
                          <AvatarImage 
                            src={lawyer?.avatar_url || ''} 
                            alt={`${lawyer?.first_name || ''} ${lawyer?.last_name || ''}`.trim()}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-3xl font-medium h-full w-full flex items-center justify-center">
                            {lawyer?.first_name && lawyer.last_name 
                              ? `${lawyer.first_name[0]}${lawyer.last_name[0]}`.toUpperCase() 
                              : 'AB'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <Badge variant="default" className="mb-2 px-3 py-1.5 inline-flex items-center justify-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400"></span>
                        <span>Disponible</span>
                      </Badge>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                          {lawyer ? `${lawyer.first_name} ${lawyer.last_name}` : 'Cargando...'}
                        </h2>
                        {/* Desktop verified badge next to name */}
                        {(lawyer?.verified || lawyer?.pjud_verified) && (
                          <div className="hidden sm:flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-xs font-medium text-green-700">
                              {lawyer?.pjud_verified ? 'Verificado en PJUD' : 'Verificado'}
                            </span>
                          </div>
                        )}
                      </div>
                      {lawyer && (
                        <div className="sm:hidden absolute top-4 right-4">
                          <FavoriteButton 
                            lawyerId={lawyer.id} 
                            showText={false}
                            onAuthRequired={() => setIsAuthModalOpen(true)}
                            className="text-gray-500 hover:text-red-500 hover:bg-gray-50 rounded-full p-2"
                          />
                        </div>
                      )}
                      {lawyer && (
                        <div className="hidden sm:flex items-center">
                          <FavoriteButton 
                            lawyerId={lawyer.id} 
                            showText={false}
                            onAuthRequired={() => setIsAuthModalOpen(true)}
                            className="text-gray-500 hover:text-red-500 hover:bg-gray-50 rounded-full"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3 w-full">
                      <div className="flex items-center w-full sm:w-auto">
                        <Star className="h-5 w-5 text-yellow-500 mr-1 flex-shrink-0" />
                        <span className="font-semibold whitespace-nowrap">
                          {lawyer?.rating ? Number(lawyer.rating).toFixed(1) : 'N/A'}
                        </span>
                        <span className="text-gray-600 ml-1">
                          ({lawyer?.review_count || 0} reseñas)
                        </span>
                      </div>
                      <div className="flex items-center w-full sm:w-auto pt-3 sm:border-t-0 sm:pt-0">
                        <MapPin className="h-4 w-4 mr-1 text-gray-600 flex-shrink-0" />
                        <span className="truncate">{lawyer?.location || 'Ubicación no especificada'}</span>
                      </div>
                    </div>

                    

                    <div className="w-full">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 w-full sm:w-auto">
                          <div className="flex items-center min-w-[160px]">
                            <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">Responde en {typeof profileData.responseTime === 'string' ? profileData.responseTime : 'poco tiempo'}</span>
                          </div>
                          <div className="flex items-center min-w-[140px]">
                            <ThumbsUp className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{profileData.completionRate} éxito en trabajos</span>
                          </div>
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span>{lawyer?.profile_views || 0} visualizaciones</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {lawyer?.website && (
                      <div className="flex items-center">
                        <a 
                          href={lawyer.website.startsWith('http') ? lawyer.website : `https://${lawyer.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          Ir al sitio de {lawyer.first_name?.split(' ')[0] || 'abogado'}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="md:pl-6 md:ml-6 md:border-l-2 md:border-gray-200 w-full md:w-68 lg:w-72 mt-6 md:mt-0 flex-shrink-0">
                    <div className="text-3xl font-bold text-primary mb-4 text-center md:text-left">
                      {lawyer?.hourly_rate_clp !== undefined && lawyer?.hourly_rate_clp !== null 
                        ? formatPrice(lawyer.hourly_rate_clp)
                        : 'Consultar precio'}
                      <span className="text-gray-500 text-sm ml-1">/hora</span>
                    </div>

                    <div className="space-y-3 w-full">
                      <div className="flex flex-col gap-3 w-full">
                        <Button 
                          className={`w-full ${(currentUser?.id === lawyer?.user_id) ? 'opacity-50 cursor-not-allowed bg-blue-600 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentUser?.id !== lawyer?.user_id) {
                              handleAuthRequired('schedule');
                            }
                          }}
                          disabled={currentUser?.id === lawyer?.user_id}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar
                        </Button>
                        <Button 
                          variant="outline" 
                          className={`w-full ${(currentUser?.id === lawyer?.user_id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentUser?.id !== lawyer?.user_id) {
                              handleAuthRequired('contact');
                            }
                          }}
                          disabled={currentUser?.id === lawyer?.user_id}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Contactar
                        </Button>
                      </div>
                      {currentUser?.id === lawyer?.user_id && (
                        <p className="text-xs text-gray-500 text-center mt-1">
                          No puedes contactar o agendar contigo mismo
                        </p>
                      )}
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
                <div className="prose max-w-none">
                  {lawyer?.bio && typeof lawyer.bio === 'string' && lawyer.bio.trim() !== '' ? (
                    <div className="whitespace-pre-line text-gray-700 mb-6">
                      {lawyer.bio}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic mb-6">
                      Este abogado no ha proporcionado una biografía.
                    </p>
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  <div>
                    <h4 className="font-semibold mb-3">Educación</h4>
                    <div className="space-y-4">
                      <div className="relative pl-4 border-l-2 border-blue-500">
                        <div className="space-y-1">
                          {lawyer?.education ? (
                            <p className="font-medium text-gray-900">
                              {lawyer.education}
                            </p>
                          ) : (
                            <p className="font-medium text-gray-900">Derecho</p>
                          )}
                          {lawyer?.university && (
                            <p className="text-gray-500">
                              {lawyer.university}
                            </p>
                          )}
                          <p className="text-gray-500 text-sm">
                            {lawyer?.study_start_year || '2010'} - {lawyer?.study_end_year || '2016'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Languages Section */}
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Idiomas</h4>
                      {lawyer?.languages && lawyer.languages.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {lawyer.languages.map((lang, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No se han especificado idiomas</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Certificaciones</h4>
                    <ul className="space-y-2">
                      {profileData.certifications.length > 0 ? (
                        profileData.certifications.map((cert, index) => (
                          <li key={index} className="text-gray-600">{cert}</li>
                        ))
                      ) : (
                        <li className="text-gray-500">No hay certificaciones registradas</li>
                      )}
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
                  {profileData.experience.length > 0 ? (
                    profileData.experience.map((exp, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-4">
                        <p className="font-medium text-gray-900">{exp}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No se ha proporcionado información de experiencia</p>
                  )}
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
                  {profileData.recentWork.map((work, index) => (
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
                      {index < profileData.recentWork.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Services Section */}
            <Card className="border shadow-sm">
              <CardHeader className="p-6">
                <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Servicios ofrecidos</CardTitle>

              </CardHeader>
              <CardContent>
                <ServicesSection 
                  services={services} 
                  isLoading={loading} 
                  isOwner={currentUser?.id === lawyer?.user_id}
                  onAuthRequired={() => setIsAuthModalOpen(true)}
                  lawyerId={lawyer?.id}
                  onContactService={(service) => {
                    if (!currentUser) {
                      handleAuthRequired('service', service);
                      return;
                    }
                    setSelectedService(service);
                    setIsContactModalOpen(true);
                  }}
                />
              </CardContent>
            </Card>

            
          </div>

        </div>
      </div>

      {/* Modals */}
      {lawyer && (
        <>
          <ContactModal
            isOpen={isContactModalOpen}
            onClose={() => {
              setSelectedService(null);
              setIsContactModalOpen(false);
            }}
            lawyerId={lawyer.id}
            lawyerName={`${lawyer.first_name} ${lawyer.last_name}`}
            service={selectedService}
          />
          
          <ScheduleModal
            isOpen={isScheduleModalOpen}
            onClose={() => setIsScheduleModalOpen(false)}
            lawyerId={lawyer.id}
            lawyerName={`${lawyer.first_name} ${lawyer.last_name}`}
            hourlyRate={lawyer.hourly_rate_clp || 0}
          />
          
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => {
              setIsAuthModalOpen(false);
              setAuthAction(null);
            }}
            onLoginSuccess={() => {
              if (authAction) {
                authAction();
              }
              setIsAuthModalOpen(false);
            }}
            mode={authMode}
            onModeChange={(newMode) => setAuthMode(newMode as 'login' | 'signup')}
          />
        </>
      )}
    </div>
  );
};

export default PublicProfile;