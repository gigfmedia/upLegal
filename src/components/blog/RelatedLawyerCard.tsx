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

  // Format display name: shorten second last name to initial
  const formatDisplayName = (name: string) => {
    if (!name) return "Abogado";

    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name; // First name + last name only, no shortening needed

    const firstName = parts[0];
    const middleName = parts.length > 3 ? parts.slice(1, -2).join(' ') : '';
    const lastName = parts.length > 2 ? parts[parts.length - 2] : '';
    const secondLastName = parts[parts.length - 1];

    // Always shorten second last name to initial if present
    if (middleName) {
      return `${firstName} ${middleName} ${lastName} ${secondLastName.charAt(0)}.`;
    }
    return `${firstName} ${lastName} ${secondLastName.charAt(0)}.`;
  };

  const displayName = formatDisplayName(lawyer.name || "");
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
      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full group"
      onClick={handleClick}
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-start gap-4 mb-4">
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
            <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
            <div className="mt-0.5 flex items-center min-h-[21px]">
              {reviewCount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-900">{rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({reviewCount} reseñas)</span>
                </div>
              ) : isVerified ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 w-fit">
                  <ShieldCheck className="h-3 w-3 mr-0.5" />
                  Verificado en PJUD
                </span>
              ) : null}
            </div>
            {isVerified && reviewCount > 0 && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none text-[11px] px-2 py-0">
                <ShieldCheck className="h-3 w-3 mr-0.5" />
                Verificado en PJUD
              </Badge>
            )}
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

        <div className="mt-auto">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-2xl font-bold text-gray-900">${formatCLP(displayPrice)}<span className="text-sm text-gray-500 font-normal text-lg"> CLP</span></span>
            <span className="text-sm text-gray-500">/ consulta 60 min</span>
          </div>

          <div className="flex items-center gap-2 mb-2 text-xs text-gray-700">
            <small className="text-gray-500 text-xs block mt-1">Videollamada · Respuesta hoy · Sin compromisos adicionales</small>
          </div>

          <p className="text-xs text-green-700 font-medium mb-2 flex items-center gap-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Disponible hoy
          </p>

          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white text-base font-semibold py-6 rounded-xl transition-all active:scale-[0.99] shadow-sm"
            onClick={handleSchedule}
          >
            Agenda consulta →
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
