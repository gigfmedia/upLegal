import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Star, CalendarCheck, Clock, FileText, Quote, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AssistantLawyer,
  AssistantLawyerServices,
} from '@/types/legalAssistant';
import { formatCLP } from '@/lib/assistantService';

const serviceIcon = (title: string) => {
  const text = (title || '').toLowerCase();
  if (text.includes('contrat')) return <FileText className="h-4 w-4" aria-hidden="true" />;
  if (text.includes('consulta')) return <Quote className="h-4 w-4" aria-hidden="true" />;
  return <FileText className="h-4 w-4" aria-hidden="true" />;
};

type LawyerServicesCardProps = {
  services: AssistantLawyerServices;
  onViewProfile: (lawyer: AssistantLawyer) => void;
  onBook: (lawyer: AssistantLawyer) => void;
};

export function LawyerServicesCard({
  services,
  onViewProfile,
  onBook,
}: LawyerServicesCardProps) {
  const { lawyer, items } = services;
  const initials = lawyer.name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const primarySpecialty = lawyer.specialties?.[0] || 'Abogado';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/60 p-4">
        <Avatar className="h-11 w-11 border border-border shadow-sm">
          {lawyer.avatar_url ? (
            <AvatarImage src={lawyer.avatar_url} alt={lawyer.name} />
          ) : null}
          <AvatarFallback className="bg-muted text-xs text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-foreground">{lawyer.name}</h4>
          <p className="truncate text-xs font-medium text-foreground/80">{primarySpecialty}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {lawyer.rating != null && lawyer.review_count != null && lawyer.review_count > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                {lawyer.rating.toFixed(1)}
                <span>({lawyer.review_count})</span>
              </span>
            )}
            {lawyer.experience_years != null && lawyer.experience_years > 0 && (
              <span>{lawyer.experience_years} años exp.</span>
            )}
            {lawyer.location && <span>{lawyer.location}</span>}
          </div>
          {lawyer.verified && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {lawyer.pjud_verified ? 'Verificado por el Poder Judicial' : 'Abogado verificado'}
            </p>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-4 text-xs leading-relaxed text-foreground/70">
          Este abogado aún no tiene servicios publicados. Puedes reservar una consulta u ver su
          perfil para conocer más.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {items.map((service) => (
            <div key={service.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {serviceIcon(service.title)}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-[13px] font-semibold leading-tight text-foreground">
                      {service.title}
                    </h5>
                    <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">
                      {service.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">
                    {service.requires_quote ? 'Desde ' : ''}
                    {formatCLP(service.display_price)}
                  </p>
                  {service.delivery_time && service.delivery_time.trim() ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {service.delivery_time}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {service.requires_quote && (
                  <Badge
                    variant="outline"
                    className={cn('h-5 text-[10px] px-2 text-foreground/70')}
                  >
                    Cotización
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto h-8 bg-zinc-900 px-3 text-[11px] text-white hover:bg-zinc-800"
                  onClick={() => onBook(lawyer)}
                >
                  <Send className="h-3 w-3" aria-hidden="true" />
                  Solicita servicio
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="border-t border-border/60 p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={() => onViewProfile(lawyer)}
          >
            Ver perfil del abogado
          </Button>
        </div>
      )}
    </div>
  );
}