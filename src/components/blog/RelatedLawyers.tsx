import { useState, useEffect, useRef } from 'react';
import { Lawyer } from '@/components/LawyerCard';
import { RelatedLawyerCard } from '@/components/blog/RelatedLawyerCard';
import { searchLawyers } from '@/pages/api/search-lawyers';
import { trackEvent } from '@/lib/track';
import { Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

// FASE 5.19 — framing contextual por problema del artículo.
// UN solo mapa slug→pregunta (sin condicionales de pathname dispersos).
// articleSlug es metadata existente; sin nueva taxonomía ni copy inventado.
const ARTICLE_QUESTIONS: { match: string[]; question: string }[] = [
  { match: ['garantia'], question: '¿No te devolvieron la garantía?' },
  { match: ['desalojo', 'desalojar', 'lanzamiento', 'devuelveme-mi-casa'], question: '¿Te están pidiendo dejar la propiedad?' },
  { match: ['reajuste', 'ipc'], question: '¿Tienes dudas sobre el reajuste de tu arriendo?' },
  { match: ['sin-contrato', 'no-tengo-contrato'], question: '¿Tienes un problema de arriendo sin contrato escrito?' },
  { match: ['dicom', 'deuda-arriendo', 'demandar-por-no-pagar', 'cobranza', 'embargo', 'ejecutivo', 'no-me-pagan'], question: '¿Tienes una deuda de arriendo encima?' },
  { match: ['cerradura'], question: '¿Tu arrendador te cambió la cerradura?' },
  { match: ['tacita'], question: '¿Tu contrato venció y sigues arrendando?' },
  { match: ['contrato', 'compraventa', 'cesion'], question: '¿Vas a firmar un contrato?' },
  { match: ['cuantos-meses'], question: '¿Llevas meses sin pagar el arriendo?' },
];

const ARRIENDO_KEYWORDS = [
  'arriendo', 'desalojo', 'desalojar', 'garantia', 'ipc', 'cerradura',
  'tacita', 'contrato', 'dicom', 'lanzamiento', 'devuelveme', 'deuda',
  'embargo', 'ejecutivo', 'cobranza', 'cuantos-meses',
];

const SUPPORTING_SENTENCE =
  'Consulta con un abogado para revisar tu situación y entender qué alternativas tienes según tu caso.';

export function resolveRelatedContext(articleSlug: string): { question: string | null; audience: 'arriendo' | 'civil' } {
  const slug = (articleSlug || '').toLowerCase();
  for (const entry of ARTICLE_QUESTIONS) {
    if (entry.match.some((k) => slug.includes(k))) return { question: entry.question, audience: 'arriendo' };
  }
  if (ARRIENDO_KEYWORDS.some((k) => slug.includes(k))) {
    return { question: '¿Necesitas revisar tu caso de arriendo?', audience: 'arriendo' };
  }
  return { question: null, audience: 'civil' };
}

interface RelatedLawyersProps {
  category: string;
  title?: string;
  articleId?: string;
}

export const RelatedLawyers = ({ category, title, articleId }: RelatedLawyersProps) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const hasTrackedShownRef = useRef(false);
  useEffect(() => {
    if (inView && lawyers.length > 0 && !hasTrackedShownRef.current) {
      hasTrackedShownRef.current = true;
      if (typeof window !== 'undefined' && window.gtag) {
        const pagePath = window.location.pathname;
        const articleSlug = articleId || pagePath.split('/').pop() || '';
        // Backward-compatible aggregate + per-card events (real exposure, no duplicate on StrictMode)
        // GA4 path (preserved verbatim for historical continuity)
        window.gtag('event', 'related_lawyers_shown', { specialty: category, page_path: pagePath, article_slug: articleSlug });
        // PostHog path via shared helper (owner-filtered, adds page_path/device_category/timestamp).
        // Mirrors the GA4 aggregate so the clean experiment is measurable in both systems.
        try {
          trackEvent('related_lawyers_shown', { specialty: category, category, page_path: pagePath, article_slug: articleSlug, source: 'related_lawyers' });
        } catch {}
        lawyers.forEach((lawyer: any, idx: number) => {
          const hasReviews = Boolean((lawyer.reviews || lawyer.review_count || 0) > 0);
          const perCardProps = {
            lawyer_id: lawyer.id || lawyer.user_id,
            lawyer_slug: lawyer.id,
            article_slug: articleSlug,
            page_path: pagePath,
            specialty: category,
            category,
            has_reviews: hasReviews,
            review_count: lawyer.reviews || lawyer.review_count || 0,
            price: lawyer.consultationPrice || lawyer.hourlyRate || 0,
            availability: Boolean(lawyer.availability?.availableToday || lawyer.availableToday),
            card_position: idx,
          };
          window.gtag('event', 'related_lawyers_shown', perCardProps);
          // PostHog mirror (same props + source; wrapped so a PostHog failure never breaks GA4)
          try {
            trackEvent('related_lawyers_shown', { ...perCardProps, source: 'related_lawyers' });
          } catch {}
        });
      }
    }
  }, [inView, lawyers, category, articleId]);

  const handleLawyerClick = (lawyerId: string, position: number, e?: React.SyntheticEvent) => {
    // Booking button clicks are handled explicitly by RelatedLawyerCard.handleSchedule
    // (related_lawyer_booking_clicked). Skip legacy profile click here to avoid double attribution.
    // Note: onClickCapture on ancestor fires before button onClick bubble, so stopPropagation
    // in the button does NOT prevent this — must guard via event target.
    try {
      const target = (e as any)?.target as HTMLElement | undefined;
      if (target && typeof target.closest === 'function' && target.closest('[data-related-booking]')) {
        return;
      }
    } catch {}
    sessionStorage.setItem('has_commercial_intent', 'true');
    if (typeof window !== 'undefined') {
      const pagePath = window.location.pathname;
      const articleSlug = articleId || pagePath.split('/').pop() || '';
      // Persist for fallback (URL is primary, sessionStorage is fallback for direct nav)
      try {
        if (articleSlug) sessionStorage.setItem('legalup_article_slug', articleSlug);
      } catch {}
      if (window.gtag) {
        const lawyer = lawyers.find((l: any) => (l.id || l.user_id) === lawyerId) as any;
        const hasReviews = Boolean((lawyer?.reviews || lawyer?.review_count || 0) > 0);
        const baseProps = {
          lawyer_id: lawyerId,
          lawyer_slug: lawyerId,
          article_slug: articleSlug,
          page_path: pagePath,
          specialty: category,
          category,
          has_reviews: hasReviews,
          review_count: lawyer?.reviews || lawyer?.review_count || 0,
          price: lawyer?.consultationPrice || lawyer?.hourlyRate || 0,
          availability: Boolean(lawyer?.availability?.availableToday || lawyer?.availableToday),
          card_position: position,
        };
        window.gtag('event', 'related_lawyer_clicked', { lawyer_id: lawyerId, specialty: category, ...baseProps });
        window.gtag('event', 'related_lawyer_card_clicked', {
          lawyer_id: lawyerId,
          article_slug: articleSlug,
          position,
          category,
          page_path: pagePath,
          has_reviews: hasReviews,
          review_count: baseProps.review_count,
          price: baseProps.price,
          availability: baseProps.availability,
        });
        // canonical F3 for PostHog
        import('@/lib/bookingFunnel').then(({ trackBookingPageViewed }) => {
          // use helper to emit lawyer_profile_viewed to both (via direct posthog for F3)
          import('@/lib/posthogLoader').then(({ posthog }) => {
            try { posthog.capture('lawyer_profile_viewed', { lawyer_id: lawyerId, article_slug: articleSlug, source: 'blog', cta_location: 'related_lawyers' }); } catch {}
          });
        });
      }
    }
  };

  useEffect(() => {
    const fetchLawyers = async () => {
      try {
        const response = await searchLawyers({
          specialty: category,
          pageSize: 6, // Fetch more to allow carousel
          page: 1,
          requirePrice: true
        });

        if (response && response.lawyers) {
          const formatted = response.lawyers.map(l => ({
            id: l.id,
            user_id: l.user_id,
            name: `${l.first_name} ${l.last_name}`.trim(),
            specialties: l.specialties || [],
            rating: l.rating || 0,
            reviews: l.review_count || 0,
            location: l.location || 'Chile',
            cases: 0,
            hourlyRate: l.hourly_rate_clp || 0,
            consultationPrice: l.hourly_rate_clp || 0,
            image: l.avatar_url || '',
            bio: l.bio || '',
            verified: Boolean(l.verified),
            pjud_verified: Boolean(l.pjud_verified),
            experience_years: l.experience_years || 0,
            created_at: l.created_at || undefined,
            availability: {
              availableToday: true,
              availableThisWeek: true,
              quickResponse: true,
              emergencyConsultations: true
            }
          }));
          // Diego Donoso al final
          formatted.sort((a, b) => {
            const aIsDiego = a.name.toLowerCase().includes('diego') && a.name.toLowerCase().includes('donoso');
            const bIsDiego = b.name.toLowerCase().includes('diego') && b.name.toLowerCase().includes('donoso');
            if (aIsDiego && !bIsDiego) return 1;
            if (!aIsDiego && bIsDiego) return -1;
            return 0;
          });
          setLawyers(formatted);
        }
      } catch (error) {
        console.error("Error fetching related lawyers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLawyers();
  }, [category]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (lawyers.length === 0) return null;

  const pagePathForSlug = typeof window !== 'undefined' ? window.location.pathname : '';
  const resolvedSlug = articleId || pagePathForSlug.split('/').pop() || '';
  const context = resolveRelatedContext(resolvedSlug);
  const heading = title || context.question || '¿Necesitas revisar tu caso?';
  const audienceLine =
    context.audience === 'arriendo'
      ? 'Abogados que atienden casos de arriendo y propiedad'
      : 'Abogados disponibles para consultas de Derecho Civil';

  return (
    <section ref={ref} className="w-full mb-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
          <p className="text-gray-600 mt-2 leading-relaxed">{SUPPORTING_SENTENCE}</p>
          <p className="text-sm text-gray-500 mt-1">{audienceLine}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
            <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> Consulta online</span>
            <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> 60 minutos</span>
            <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> Precio fijo</span>
          </div>
        </div>

        <div
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:pb-0"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {lawyers.map((lawyer, idx) => (
            <div
              key={lawyer.id}
              className="w-[82%] shrink-0 snap-center sm:w-auto"
              onClickCapture={(e) => handleLawyerClick(lawyer.id, idx, e)}
            >
              <RelatedLawyerCard lawyer={lawyer} category={category} articleSlug={resolvedSlug} cardPosition={idx} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
