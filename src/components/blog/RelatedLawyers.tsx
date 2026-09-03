import { useState, useEffect, useRef } from 'react';
import { Lawyer } from '@/components/LawyerCard';
import { RelatedLawyerCard } from '@/components/blog/RelatedLawyerCard';
import { searchLawyers } from '@/pages/api/search-lawyers';
import { Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';

interface RelatedLawyersProps {
  category: string;
  title?: string;
  articleId?: string;
}

export const RelatedLawyers = ({ category, title = "¿Necesitas resolver este problema hoy?", articleId }: RelatedLawyersProps) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [slidesToScroll, setSlidesToScroll] = useState(1);

  useEffect(() => {
    const update = () => setSlidesToScroll(window.innerWidth >= 1024 ? 2 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
        window.gtag('event', 'related_lawyers_shown', { specialty: category, page_path: pagePath, article_slug: articleSlug });
        lawyers.forEach((lawyer: any, idx: number) => {
          const hasReviews = Boolean((lawyer.reviews || lawyer.review_count || 0) > 0);
          window.gtag('event', 'related_lawyers_shown', {
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
          });
        });
      }
    }
  }, [inView, lawyers, category, articleId]);

  const handleLawyerClick = (lawyerId: string, position: number) => {
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

  const showCarousel = lawyers.length >= 2;

  return (
    <section ref={ref} className="w-full mb-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
            <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> Respuesta hoy</span>
            <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> Consulta online</span>
            <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> 60 minutos</span>
            <span className="flex items-center gap-1.5 text-sm text-gray-700"><span className="text-green-600 font-bold">✓</span> Precio fijo</span>
          </div>
        </div>

        {showCarousel ? (
          <Carousel
            opts={{
              align: "start",
              loop: false,
              slidesToScroll,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {lawyers.map((lawyer, idx) => {
                const pagePath = typeof window !== 'undefined' ? window.location.pathname : '';
                const articleSlugForCard = articleId || pagePath.split('/').pop() || '';
                return (
                <CarouselItem key={lawyer.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                  <div className="h-full" onClickCapture={() => handleLawyerClick(lawyer.id, idx)}>
                    <RelatedLawyerCard lawyer={lawyer} category={category} articleSlug={articleSlugForCard} />
                  </div>
                </CarouselItem>
                );
              })}
            </CarouselContent>
            <div className="hidden md:block">
              <CarouselPrevious className="-left-12 bg-white" />
              <CarouselNext className="-right-12 bg-white" />
            </div>
            {/* Mobile Controls */}
            <div className="flex justify-center gap-4 mt-8 md:hidden">
              <CarouselPrevious className="static translate-y-0 bg-white" />
              <CarouselNext className="static translate-y-0 bg-white" />
            </div>
          </Carousel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lawyers.map((lawyer, idx) => {
                const pagePathGrid = typeof window !== 'undefined' ? window.location.pathname : '';
                const articleSlugForCardGrid = articleId || pagePathGrid.split('/').pop() || '';
                return (
              <div key={lawyer.id} className="h-full" onClickCapture={() => handleLawyerClick(lawyer.id, idx)}>
                <RelatedLawyerCard lawyer={lawyer} category={category} articleSlug={articleSlugForCardGrid} />
              </div>
                );
              })}
          </div>
        )}
      </div>
    </section>
  );
};
