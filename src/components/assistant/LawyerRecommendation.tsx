import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Star, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantLawyer } from '@/types/legalAssistant';
import { formatCLP } from '@/lib/assistantService';

type LawyerRecommendationProps = {
  lawyer: AssistantLawyer;
  isTopPick?: boolean;
  onViewProfile: (lawyer: AssistantLawyer) => void;
  onBook: (lawyer: AssistantLawyer) => void;
};

export function LawyerRecommendation({
  lawyer,
  isTopPick = false,
  onViewProfile,
  onBook,
}: LawyerRecommendationProps) {
  const initials = lawyer.name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const primarySpecialty = lawyer.specialties?.[0] || 'Abogado';
  const priceLabel = lawyer.bestService
    ? `Consulta ${formatCLP(lawyer.bestService.display_price)} CLP` 
    : lawyer.hourly_rate_clp
      ? `${formatCLP(lawyer.hourly_rate_clp)}/hora`
      : 'Consultar valor';
  const description = lawyer.explanation || lawyer.matchReasons.join(' ');

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-sm',
        isTopPick ? 'border-foreground/15 ring-1 ring-foreground/10' : 'border-border'
      )}
    >
      {isTopPick && (
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
          El abogado que mejor coincide con tu caso
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border border-border shadow-sm">
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
          </div>
        </div>

        {description && (
          <p className="mt-3 text-[11px] leading-relaxed text-foreground/70">
            {description.slice(0, 160)}
          </p>
        )}

        {lawyer.verified && (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {lawyer.pjud_verified ? 'Verificado por el Poder Judicial' : 'Abogado verificado'}
          </p>
        )}

        <p className="mt-3 border-t border-border/60 pt-3 text-xs font-semibold text-foreground">
          {priceLabel}
        </p>

        <div className="mt-3 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full text-xs"
            onClick={() => onViewProfile(lawyer)}
          >
            Ver perfil
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 w-full bg-zinc-900 text-xs text-white hover:bg-zinc-800"
            onClick={() => onBook(lawyer)}
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Agenda consulta
          </Button>
        </div>
      </div>
    </div>
  );
}
