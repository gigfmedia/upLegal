import type { AssistantLawyer } from '@/types/legalAssistant';
import { LawyerRecommendation } from './LawyerRecommendation';

type LawyerRecommendationListProps = {
  lawyers: AssistantLawyer[];
  onViewProfile: (lawyer: AssistantLawyer) => void;
  onBook: (lawyer: AssistantLawyer) => void;
};

export function LawyerRecommendationList({
  lawyers,
  onViewProfile,
  onBook,
}: LawyerRecommendationListProps) {
  if (!lawyers || lawyers.length === 0) return null;

  const [top, ...rest] = lawyers;
  const alternatives = rest.slice(0, 2);

  return (
    <div className="flex flex-col gap-2.5">
      {top && (
        <LawyerRecommendation
          lawyer={top}
          isTopPick
          onViewProfile={onViewProfile}
          onBook={onBook}
        />
      )}
      {alternatives.length > 0 && (
        <>
          <p className="pt-1 text-[11px] font-medium text-foreground/70">
            También puedes considerar:
          </p>
          {alternatives.map((lawyer) => (
            <LawyerRecommendation
              key={lawyer.id}
              lawyer={lawyer}
              onViewProfile={onViewProfile}
              onBook={onBook}
            />
          ))}
        </>
      )}
    </div>
  );
}
