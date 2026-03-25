import { useState, useEffect } from 'react';
import { Lawyer, LawyerCard } from '@/components/LawyerCard';
import { searchLawyers } from '@/pages/api/search-lawyers';
import { Loader2 } from 'lucide-react';
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
}

export const RelatedLawyers = ({ category, title = "Habla con un abogado especialista" }: RelatedLawyersProps) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);

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
            availability: {
              availableToday: true,
              availableThisWeek: true,
              quickResponse: true,
              emergencyConsultations: true
            }
          }));
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

  const showCarousel = lawyers.length > 3;

  return (
    <section className="mt-4 bg-white border-y border-blue-100 w-full py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">Abogados verificados disponibles para asesorarte en {category}.</p>
        </div>

        {showCarousel ? (
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {lawyers.map(lawyer => (
                <CarouselItem key={lawyer.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <LawyerCard lawyer={lawyer} />
                  </div>
                </CarouselItem>
              ))}
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
            {lawyers.map(lawyer => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
