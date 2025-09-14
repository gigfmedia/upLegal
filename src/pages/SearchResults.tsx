import { useState, useEffect, useRef } from "react";
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

const SearchResults = () => {
  const { user } = useAuth() as AuthContextType;
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
  
  // New filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [availableNow, setAvailableNow] = useState<boolean>(false);
  
  // Mock data
  const mockLawyers: Lawyer[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      specialties: ["Derecho Civil", "Derecho de Familia"],
      rating: 4.9,
      reviews: 127,
      location: "Santiago, Chile",
      cases: 289,
      hourlyRate: 350000,
      consultationPrice: 35000,
      image: "",
      bio: "Abogada especializada en derecho de familia con más de 10 años de experiencia. Mi enfoque es brindar asesoría personalizada y soluciones efectivas a mis clientes.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: true,
        emergencyConsultations: true
      }
    },
    {
      id: "2",
      name: "Carlos Mendoza",
      specialties: ["Derecho Penal", "Derecho Procesal"],
      rating: 4.8,
      reviews: 89,
      location: "Santiago, Chile",
      cases: 156,
      hourlyRate: 280000,
      consultationPrice: 40000,
      image: "",
      bio: "Abogado penalista con amplia experiencia en defensa penal y asesoría en procesos judiciales. Mi objetivo es garantizar los derechos de mis clientes en todo momento.",
      verified: true,
      availability: {
        availableToday: false,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: true
      }
    },
    {
      id: "3",
      name: "María Fernanda López",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.7,
      reviews: 156,
      location: "Viña del Mar, Chile",
      cases: 342,
      hourlyRate: 250000,
      consultationPrice: 30000,
      image: "",
      bio: "Especialista en derecho de familia con un enfoque en soluciones pacíficas y mediación. Más de 8 años ayudando a familias a resolver sus conflictos legales de manera efectiva.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: true,
        emergencyConsultations: false
      }
    },
    {
      id: "4",
      name: "Andrés Rojas",
      specialties: ["Derecho Inmobiliario", "Derecho Civil"],
      rating: 4.9,
      reviews: 203,
      location: "Las Condes, Chile",
      cases: 198,
      hourlyRate: 320000,
      consultationPrice: 38000,
      image: "",
      bio: "Especialista en derecho inmobiliario con más de 12 años de experiencia en transacciones de bienes raíces, arrendamientos y asesoría legal a empresas constructoras.",
      verified: true,
      availability: {
        availableToday: false,
        availableThisWeek: true,
        quickResponse: true,
        emergencyConsultations: false
      }
    },
    {
      id: "5",
      name: "Carolina Díaz",
      specialties: ["Derecho Laboral", "Derecho de Seguridad Social"],
      rating: 4.6,
      reviews: 92,
      location: "Providencia, Chile",
      cases: 267,
      hourlyRate: 230000,
      consultationPrice: 28000,
      image: "",
      bio: "Abogada laboralista especializada en derecho del trabajo y seguridad social. Con más de 7 años de experiencia asesorando tanto a trabajadores como a empleadores.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: true
      }
    },
    {
      id: "6",
      name: "Javier Muñoz",
      specialties: ["Derecho Tributario", "Derecho Comercial"],
      rating: 4.8,
      reviews: 134,
      location: "La Serena, Chile",
      cases: 189,
      hourlyRate: 400000,
      consultationPrice: 45000,
      image: "",
      bio: "Especialista en derecho tributario y comercial con amplia experiencia en planificación fiscal y asesoría a empresas. Más de 10 años ayudando a clientes a optimizar sus obligaciones tributarias.",
      verified: true,
      availability: {
        availableToday: false,
        availableThisWeek: true,
        quickResponse: true,
        emergencyConsultations: false
      }
    },
    {
      id: "7",
      name: "Valentina Soto",
      specialties: ["Derecho de Propiedad Intelectual", "Derecho Comercial"],
      rating: 4.7,
      reviews: 78,
      location: "Concepción, Chile",
      cases: 312,
      hourlyRate: 270000,
      consultationPrice: 35000,
      image: "",
      bio: "Especialista en propiedad intelectual con más de 8 años de experiencia protegiendo los derechos de creadores y empresas. Enfoque en marcas, patentes y derechos de autor con un enfoque estratégico.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "8",
      name: "Roberto Navarro",
      specialties: ["Derecho Penal", "Derecho Procesal"],
      rating: 4.5,
      reviews: 201,
      location: "Valparaíso, Chile",
      cases: 423,
      hourlyRate: 290000,
      consultationPrice: 32000,
      image: "",
      bio: "Abogado penalista con amplia experiencia en defensa penal y derecho procesal penal. Más de 15 años representando clientes en casos complejos con un enfoque en la protección de sus derechos fundamentales.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "9",
      name: "Daniela Castro",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.9,
      reviews: 187,
      location: "La Florida, Chile",
      cases: 456,
      hourlyRate: 310000,
      consultationPrice: 37000,
      image: "",
      bio: "Abogada especializada en derecho de familia y civil con más de 12 años de experiencia. Enfoque en soluciones efectivas para temas de divorcio, cuidado personal y bienes familiares, priorizando siempre el bienestar de las familias.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "10",
      name: "Felipe Gutiérrez",
      specialties: ["Derecho Laboral", "Derecho Administrativo"],
      rating: 4.6,
      reviews: 112,
      location: "Maipú, Chile",
      cases: 278,
      hourlyRate: 260000,
      consultationPrice: 31000,
      image: "",
      bio: "Especialista en derecho laboral y administrativo con más de 8 años de experiencia asesorando tanto a trabajadores como empleadores. Enfoque en despidos, negociaciones colectivas y procedimientos administrativos laborales, ofreciendo soluciones efectivas y personalizadas.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "11",
      name: "Camila Riquelme",
      specialties: ["Derecho Administrativo", "Derecho de Extranjería"],
      rating: 4.7,
      reviews: 95,
      location: "Antofagasta, Chile",
      cases: 234,
      hourlyRate: 240000,
      consultationPrice: 29000,
      image: "",
      bio: "Especialista en derecho administrativo y extranjería con más de 7 años de experiencia. Enfoque en procedimientos migratorios, permisos de residencia y asesoría a extranjeros, ofreciendo un acompañamiento cercano y soluciones efectivas en materia migratoria y administrativa.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "12",
      name: "Diego Pizarro",
      specialties: ["Derecho de Propiedad Intelectual", "Derecho Comercial"],
      rating: 4.8,
      reviews: 103,
      location: "Las Condes, Chile",
      cases: 321,
      hourlyRate: 350000,
      consultationPrice: 42000,
      image: "",
      bio: "Especialista en propiedad intelectual y derecho comercial con más de 10 años de experiencia. Enfoque en la protección de marcas, patentes y derechos de autor, así como en asesoría a empresas en materia contractual y regulatoria. Apasionado por encontrar soluciones innovadoras para proteger los activos intangibles de mis clientes.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "13",
      name: "Fernanda Guzmán",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.9,
      reviews: 176,
      location: "Ñuñoa, Chile",
      cases: 401,
      hourlyRate: 280000,
      consultationPrice: 34000,
      image: "",
      bio: "Abogada especializada en derecho de familia con más de 10 años de experiencia. Enfoque en casos complejos de custodia, alimentos y bienes familiares. Comprometida con soluciones justas y efectivas para mis clientes.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "14",
      name: "Gustavo Méndez",
      specialties: ["Derecho Comercial", "Derecho de Seguros"],
      rating: 4.7,
      reviews: 84,
      location: "Vitacura, Chile",
      cases: 219,
      hourlyRate: 330000,
      consultationPrice: 40000,
      image: "",
      bio: "Experto en derecho comercial y de seguros con más de 12 años de experiencia. Asesoro a empresas en la contratación mercantil, reclamaciones de seguros y cumplimiento regulatorio. Enfoque en soluciones prácticas y efectivas.",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "15",
      name: "Paulina Rivas",
      specialties: ["Derecho de Salud", "Derecho Administrativo"],
      rating: 4.8,
      reviews: 142,
      location: "Providencia, Chile",
      cases: 356,
      hourlyRate: 300000,
      consultationPrice: 36000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "16",
      name: "Rodrigo Silva",
      specialties: ["Derecho Ambiental", "Derecho Administrativo"],
      rating: 4.6,
      reviews: 67,
      location: "Puerto Varas, Chile",
      cases: 187,
      hourlyRate: 290000,
      consultationPrice: 35000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "17",
      name: "Andrea Muñoz",
      specialties: ["Derecho de Consumidor", "Derecho Comercial"],
      rating: 4.7,
      reviews: 93,
      location: "La Reina, Chile",
      cases: 245,
      hourlyRate: 260000,
      consultationPrice: 32000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "18",
      name: "Hernán Lagos",
      specialties: ["Derecho Comercial", "Derecho Tributario"],
      rating: 4.8,
      reviews: 118,
      location: "Las Condes, Chile",
      cases: 312,
      hourlyRate: 370000,
      consultationPrice: 45000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "19",
      name: "Francisca Tapia",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.9,
      reviews: 156,
      location: "La Florida, Chile",
      cases: 378,
      hourlyRate: 270000,
      consultationPrice: 33000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "20",
      name: "Tomás Herrera",
      specialties: ["Derecho Deportivo", "Derecho Civil"],
      rating: 4.5,
      reviews: 72,
      location: "Vitacura, Chile",
      cases: 201,
      hourlyRate: 250000,
      consultationPrice: 30000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "21",
      name: "Carolina Poblete",
      specialties: ["Derecho Laboral", "Derecho de Seguridad Social"],
      rating: 4.7,
      reviews: 88,
      location: "Valparaíso, Chile",
      cases: 234,
      hourlyRate: 240000,
      consultationPrice: 32000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "22",
      name: "Francisco Rojas",
      specialties: ["Derecho Penal", "Derecho Procesal Penal"],
      rating: 4.8,
      reviews: 145,
      location: "Concepción, Chile",
      cases: 356,
      hourlyRate: 280000,
      consultationPrice: 35000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "23",
      name: "Valentina Muñoz",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.9,
      reviews: 167,
      location: "La Serena, Chile",
      cases: 394,
      hourlyRate: 260000,
      consultationPrice: 31000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "24",
      name: "Diego González",
      specialties: ["Derecho Comercial", "Derecho Tributario"],
      rating: 4.6,
      reviews: 94,
      location: "Antofagasta, Chile",
      cases: 251,
      hourlyRate: 320000,
      consultationPrice: 38000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "25",
      name: "Camila Rojas",
      specialties: ["Derecho Inmobiliario", "Derecho Civil"],
      rating: 4.7,
      reviews: 112,
      location: "Viña del Mar, Chile",
      cases: 287,
      hourlyRate: 300000,
      consultationPrice: 36000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "26",
      name: "Javier López",
      specialties: ["Derecho de Salud", "Derecho Administrativo"],
      rating: 4.5,
      reviews: 76,
      location: "Temuco, Chile",
      cases: 206,
      hourlyRate: 250000,
      consultationPrice: 30000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "27",
      name: "Daniela Soto",
      specialties: ["Derecho Ambiental", "Derecho Administrativo"],
      rating: 4.8,
      reviews: 98,
      location: "Puerto Montt, Chile",
      cases: 263,
      hourlyRate: 290000,
      consultationPrice: 34000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "28",
      name: "Roberto Díaz",
      specialties: ["Derecho de Consumidor", "Derecho Civil"],
      rating: 4.6,
      reviews: 84,
      location: "Rancagua, Chile",
      cases: 229,
      hourlyRate: 230000,
      consultationPrice: 28000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "29",
      name: "María José Gutiérrez",
      specialties: ["Derecho de Familia", "Derecho de Menores"],
      rating: 4.9,
      reviews: 178,
      location: "Talca, Chile",
      cases: 412,
      hourlyRate: 270000,
      consultationPrice: 32000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "30",
      name: "Carlos Andrade",
      specialties: ["Derecho Minero", "Derecho Ambiental"],
      rating: 4.7,
      reviews: 102,
      location: "Calama, Chile",
      cases: 278,
      hourlyRate: 350000,
      consultationPrice: 36000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "31",
      name: "Paula Contreras",
      specialties: ["Derecho de Propiedad Intelectual", "Derecho Comercial"],
      rating: 4.8,
      reviews: 91,
      location: "Iquique, Chile",
      hourlyRate: 310000,
      consultationPrice: 37000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "32",
      name: "Felipe Muñoz",
      specialties: ["Derecho Aduanero", "Derecho Tributario"],
      rating: 4.6,
      reviews: 87,
      location: "Arica, Chile",
      hourlyRate: 280000,
      consultationPrice: 33000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "33",
      name: "Valeria Riquelme",
      specialties: ["Derecho de Seguros", "Derecho Civil"],
      rating: 4.7,
      reviews: 105,
      location: "Punta Arenas, Chile",
      hourlyRate: 260000,
      consultationPrice: 31000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "34",
      name: "Gabriel Torres",
      specialties: ["Derecho Marítimo", "Derecho Comercial"],
      rating: 4.8,
      reviews: 93,
      location: "Valdivia, Chile",
      hourlyRate: 320000,
      consultationPrice: 38000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "35",
      name: "Daniela Castro",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.9,
      reviews: 187,
      location: "La Florida, Chile",
      hourlyRate: 310000,
      consultationPrice: 37000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "36",
      name: "Felipe Gutiérrez",
      specialties: ["Derecho Laboral", "Derecho Administrativo"],
      rating: 4.6,
      reviews: 112,
      location: "Maipú, Chile",
      hourlyRate: 260000,
      consultationPrice: 31000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "37",
      name: "Camila Riquelme",
      specialties: ["Derecho Administrativo", "Derecho de Extranjería"],
      rating: 4.7,
      reviews: 95,
      location: "Antofagasta, Chile",
      hourlyRate: 240000,
      consultationPrice: 29000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "38",
      name: "Diego Pizarro",
      specialties: ["Derecho de Propiedad Intelectual", "Derecho Comercial"],
      rating: 4.8,
      reviews: 103,
      location: "Las Condes, Chile",
      hourlyRate: 350000,
      consultationPrice: 42000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "39",
      name: "Fernanda Guzmán",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.9,
      reviews: 176,
      location: "Ñuñoa, Chile",
      hourlyRate: 280000,
      consultationPrice: 34000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "40",
      name: "Gustavo Méndez",
      specialties: ["Derecho Comercial", "Derecho de Seguros"],
      rating: 4.7,
      reviews: 84,
      location: "Vitacura, Chile",
      hourlyRate: 330000,
      consultationPrice: 40000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "41",
      name: "Paulina Rivas",
      specialties: ["Derecho de Salud", "Derecho Administrativo"],
      rating: 4.8,
      reviews: 142,
      location: "Providencia, Chile",
      hourlyRate: 300000,
      consultationPrice: 36000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "42",
      name: "Rodrigo Silva",
      specialties: ["Derecho Ambiental", "Derecho Administrativo"],
      rating: 4.6,
      reviews: 67,
      location: "Puerto Varas, Chile",
      hourlyRate: 290000,
      consultationPrice: 35000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "43",
      name: "Andrea Muñoz",
      specialties: ["Derecho de Consumidor", "Derecho Comercial"],
      rating: 4.7,
      reviews: 93,
      location: "La Reina, Chile",
      hourlyRate: 260000,
      consultationPrice: 32000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "44",
      name: "Hernán Lagos",
      specialties: ["Derecho Comercial", "Derecho Tributario"],
      rating: 4.8,
      reviews: 118,
      location: "Las Condes, Chile",
      hourlyRate: 370000,
      consultationPrice: 45000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "45",
      name: "Francisca Tapia",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.9,
      reviews: 156,
      location: "La Florida, Chile",
      hourlyRate: 270000,
      consultationPrice: 33000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "46",
      name: "Tomás Herrera",
      specialties: ["Derecho Deportivo", "Derecho Civil"],
      rating: 4.5,
      reviews: 72,
      location: "Vitacura, Chile",
      hourlyRate: 250000,
      consultationPrice: 30000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "47",
      name: "Carolina Poblete",
      specialties: ["Derecho Laboral", "Derecho de Seguridad Social"],
      rating: 4.7,
      reviews: 88,
      location: "Valparaíso, Chile",
      hourlyRate: 240000,
      consultationPrice: 32000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "48",
      name: "Francisco Rojas",
      specialties: ["Derecho Penal", "Derecho Procesal Penal"],
      rating: 4.8,
      reviews: 145,
      location: "Concepción, Chile",
      hourlyRate: 280000,
      consultationPrice: 35000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "49",
      name: "Valentina Muñoz",
      specialties: ["Derecho de Familia", "Derecho Civil"],
      rating: 4.9,
      reviews: 167,
      location: "La Serena, Chile",
      hourlyRate: 260000,
      consultationPrice: 31000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "50",
      name: "Diego González",
      specialties: ["Derecho Comercial", "Derecho Tributario"],
      rating: 4.6,
      reviews: 94,
      location: "Antofagasta, Chile",
      hourlyRate: 320000,
      consultationPrice: 38000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "51",
      name: "Camila Rojas",
      specialties: ["Derecho Inmobiliario", "Derecho Civil"],
      rating: 4.7,
      reviews: 112,
      location: "Viña del Mar, Chile",
      hourlyRate: 300000,
      consultationPrice: 36000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "52",
      name: "Javier López",
      specialties: ["Derecho de Salud", "Derecho Administrativo"],
      rating: 4.5,
      reviews: 76,
      location: "Temuco, Chile",
      hourlyRate: 250000,
      consultationPrice: 30000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "53",
      name: "Daniela Soto",
      specialties: ["Derecho Ambiental", "Derecho Administrativo"],
      rating: 4.8,
      reviews: 98,
      location: "Puerto Montt, Chile",
      hourlyRate: 290000,
      consultationPrice: 34000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "54",
      name: "Roberto Díaz",
      specialties: ["Derecho de Consumidor", "Derecho Civil"],
      rating: 4.6,
      reviews: 84,
      location: "Rancagua, Chile",
      hourlyRate: 230000,
      consultationPrice: 28000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    },
    {
      id: "55",
      name: "María José Gutiérrez",
      specialties: ["Derecho de Familia", "Derecho de Menores"],
      rating: 4.9,
      reviews: 178,
      location: "Talca, Chile",
      hourlyRate: 270000,
      consultationPrice: 32000,
      image: "",
      bio: "",
      verified: true,
      availability: {
        availableToday: true,
        availableThisWeek: true,
        quickResponse: false,
        emergencyConsultations: false
      }
    }
  ];

  // Lista de especialidades en español de Chile

const handleSearch = (query: string, specialty: string, location: string) => {
  setSearchTerm(query);
  setSelectedSpecialty(specialty);
  setLocation(location);
  
  // Update URL
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (specialty !== 'all') params.set('specialty', specialty);
  if (location) params.set('location', location);
  
  window.history.pushState({}, '', `?${params.toString()}`);
};

const handleApplyFilters = (filters: {
  priceRange: [number, number];
  minRating: number;
  minExperience: number;
  availableNow: boolean;
}) => {
  setPriceRange(filters.priceRange);
  setMinRating(filters.minRating);
  setMinExperience(filters.minExperience);
  setAvailableNow(filters.availableNow);
};

const clearFilters = () => {
  setSearchTerm('');
  setSelectedSpecialty('all');
  setLocation('');
  setPriceRange([0, 1000000]);
  setMinRating(0);
  setMinExperience(0);
  setAvailableNow(false);
};

const filteredLawyers = mockLawyers.filter(lawyer => {
  const matchesSearch = lawyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lawyer.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
  const matchesSpecialty = selectedSpecialty === 'all' || lawyer.specialties.includes(selectedSpecialty);
  const matchesLocation = !location || lawyer.location.toLowerCase().includes(location.toLowerCase());
  const matchesPrice = lawyer.hourlyRate >= priceRange[0] && lawyer.hourlyRate <= priceRange[1];
  const matchesRating = lawyer.rating >= minRating;
  // Assuming we add an experience field to the Lawyer interface
  const matchesExperience = true; // Add actual experience filtering when data is available
  const matchesAvailability = !availableNow || true; // Add actual availability check when data is available
  
  return matchesSearch && matchesSpecialty && matchesLocation && 
         matchesPrice && matchesRating && matchesExperience && matchesAvailability;
}).sort((a, b) => {
  switch (sortBy) {
    case 'relevance':
      // Simple relevance sorting based on search term match
      if (searchTerm) {
        const aMatch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0;
        const bMatch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0;
        return bMatch - aMatch || b.rating - a.rating;
      }
      return b.rating - a.rating;
    case 'rating-desc':
      return b.rating - a.rating;
    case 'price-asc':
      return a.hourlyRate - b.hourlyRate;
    case 'price-desc':
      return b.hourlyRate - a.hourlyRate;
    case 'reviews-desc':
      return b.reviews - a.reviews;
    default:
      return 0;
  }
});

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
      <div className="bg-white py-8 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      
      {/* Filtros deslizantes */}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
        
        {/* Results Grid */}
        {filteredLawyers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLawyers.map((lawyer) => (
              <div key={lawyer.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                <LawyerCard
                  lawyer={lawyer}
                  onContact={() => handleContactClick(lawyer)}
                  onSchedule={() => handleScheduleClick(lawyer)}
                />
              </div>
            ))}
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