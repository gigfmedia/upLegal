import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Star, Lock, Clock, MessageCircle } from "lucide-react";
import type { Lawyer } from "@/components/LawyerCardV2";

const formatCLP = (amount: number): string => {
  return Math.round(amount / 1000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ".000";
};

const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

interface RelatedLawyerCardProps {
  lawyer: Lawyer;
  category?: string;
  onContact?: (lawyerId: string) => void;
}

export const RelatedLawyerCard = ({ lawyer, category, onContact }: RelatedLawyerCardProps) => {
  const navigate = useNavigate();
  const displayName = lawyer.name || "Abogado";
  const initials = displayName.split(' ').filter(n => n).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const rating = lawyer.rating || 0;
  const reviewCount = lawyer.review_count || lawyer.reviews || 0;
  const price = lawyer.consultationPrice || lawyer.hourlyRate || 0;
  const clientSurchargePercent = 0.1;
  const roundToThousands = (amount: number) => Math.round(amount / 1000) * 1000;
  const displayPrice = roundToThousands(price * (1 + clientSurchargePercent));
  const isVerified = Boolean(lawyer.verified || lawyer.pjud_verified);
  const experienceYears = lawyer.experience_years || 0;

  const specialties = (Array.isArray(lawyer.specialties)
    ? lawyer.specialties.flatMap(s => typeof s === 'string' ? s.split(',').map(x => x.trim()) : [])
    : typeof lawyer.specialties === 'string'
      ? lawyer.specialties.split(',').map(s => s.trim())
      : []
  ).filter(s => s);

  const sortedSpecialties = [...specialties];
  if (category) {
    const idx = sortedSpecialties.findIndex(s =>
      s.toLowerCase().includes(category.toLowerCase().replace('derecho ', '').replace('del ', ''))
    );
    if (idx > 0) {
      const [item] = sortedSpecialties.splice(idx, 1);
      sortedSpecialties.unshift(item);
    }
  }

  const handleClick = () => {
    if (onContact) onContact(lawyer.id);
    window.gtag?.('event', 'related_lawyer_clicked', { lawyer_id: lawyer.id });
    const slug = createSlug(displayName);
    navigate(`/abogado/${slug}-${lawyer.id}`);
  };

  const handleSchedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.gtag?.('event', 'select_lawyer', { lawyer_id: lawyer.user_id || lawyer.id });
    const slug = createSlug(displayName);
    navigate(`/booking/${slug}-${lawyer.user_id || lawyer.id}`);
  };

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col group"
      onClick={handleClick}
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-14 w-14 ring-2 ring-green-100">
              <AvatarImage src={lawyer.image} alt={displayName} className="object-cover" />
              <AvatarFallback className="bg-green-900 text-green-600 text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 truncate">{displayName}</h3>
            {/* <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-gray-900">{rating.toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="text-xs text-gray-500">({reviewCount} reseñas)</span>
              )}
            </div> */}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-none text-[11px] px-2 py-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse mr-1" />
                Responde hoy
              </Badge>
              {isVerified && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none text-[11px] px-2 py-0">
                  <ShieldCheck className="h-3 w-3 mr-0.5" />
                  Verificado en PJUD
                </Badge>
              )}
            </div>
            {experienceYears > 0 && (
              <p className="text-xs text-gray-500 mt-2">{experienceYears} años de experiencia</p>
            )}
          </div>
        </div>

        {sortedSpecialties.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 font-medium whitespace-nowrap overflow-hidden">
              Especialista en {sortedSpecialties[0]}
              {sortedSpecialties.length > 1 && (
                <span className="text-gray-400"> +{sortedSpecialties.length - 1} más</span>
              )}
            </p>
          </div>
        )}

        {lawyer.bio && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{lawyer.bio}</p>
        )}

        <div className="auto">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-2xl font-bold text-gray-900">${formatCLP(displayPrice)}<span className="text-sm text-gray-500 font-normal text-lg"> CLP</span></span>
            <span className="text-sm text-gray-500">/ consulta 60 min</span>
          </div>

          <div className="flex items-center gap-2 mb-4 text-xs text-gray-700">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Agenda online</span>
            <span className="text-gray-700">|</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />Consulta por videollamada</span>
          </div>

          <Button
            size="lg"
            className="w-full bg-gray-900 hover:bg-green-900 text-white text-base py-6 rounded-xl transition-all active:scale-[0.99]"
            onClick={handleSchedule}
          >
            Revisar mi caso
          </Button>

          <p className="text-center text-xs text-gray-700 mt-3">
            <Lock className="h-3 w-3 inline-block mr-1 -mt-1" />
            Pago seguro con Mercado Pago
          </p>
        </div>
      </div>
    </div>
  );
};
