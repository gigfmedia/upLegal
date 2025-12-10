import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RatingStars } from './RatingStars';
import { ReviewCard } from './ReviewCard';
import { WriteReviewModal } from './WriteReviewModal';
import { ratingService } from '@/services/ratingService';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Loader2 } from 'lucide-react';

interface LawyerReviewsSectionProps {
  lawyerId: string;
  lawyerName: string;
}

export function LawyerReviewsSection({ lawyerId, lawyerName }: LawyerReviewsSectionProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0 });
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [canWriteReview, setCanWriteReview] = useState(false);

  useEffect(() => {
    loadReviews();
    checkIfCanReview();
  }, [lawyerId, user]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      
      // Load only approved reviews
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReviews(reviewsData || []);

      // Calculate stats from approved reviews only
      if (reviewsData && reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviewsData.length;
        
        setRatingStats({
          average: parseFloat(averageRating.toFixed(1)),
          count: reviewsData.length
        });

        // Calculate distribution
        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviewsData.forEach(review => {
          distribution[review.rating] = (distribution[review.rating] || 0) + 1;
        });
        setRatingDistribution(distribution);
      } else {
        setRatingStats({ average: 0, count: 0 });
        setRatingDistribution({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfCanReview = async () => {
    if (!user) {
      setCanWriteReview(false);
      return;
    }

    try {
      // Check if user has already reviewed
      const existingReview = await ratingService.getUserRating(lawyerId, user.id);
      if (existingReview) {
        setCanWriteReview(false);
        return;
      }

      // Check if user has had a consultation with this lawyer
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: consultations } = await supabase
        .from('consultations')
        .select('id')
        .eq('client_id', user.id)
        .eq('lawyer_id', lawyerId)
        .eq('status', 'completed')
        .limit(1);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('user_id', user.id)
        .eq('lawyer_id', lawyerId)
        .eq('status', 'completed')
        .limit(1);

      setCanWriteReview(
        (consultations && consultations.length > 0) || 
        (appointments && appointments.length > 0)
      );
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setCanWriteReview(false);
    }
  };

  const handleReviewSubmitted = () => {
    setShowWriteReview(false);
    loadReviews();
    checkIfCanReview();
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const hasMoreReviews = reviews.length > 3;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="h-7 w-64 bg-gray-200 rounded mb-2 animate-pulse" />
          <div className="h-4 w-80 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Rating Summary Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
          {/* Average Rating */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-24 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <div key={star} className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="flex items-center gap-3">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-2 flex-1 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Reviews List Skeleton */}
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-gray-200 pb-6 last:border-0">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-10 w-10 bg-gray-200 rounded-full flex-shrink-0 animate-pulse" />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div key={star} className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
                        ))}
                      </div>
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-5/6 bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
                  
                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-4">
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="reviews-section" className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight mb-2">
          Reseñas y Calificaciones
        </h3>
        <p className="text-gray-600">
          Lo que dicen los clientes sobre este abogado
        </p>
      </div>

      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
        {/* Average Rating */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-6xl font-bold text-gray-900 mb-2">
            {ratingStats.average.toFixed(1)}
          </div>
          <RatingStars rating={ratingStats.average} size="lg" className="mb-2" />
          <p className="text-gray-600">
            Basado en {ratingStats.count} reseña{ratingStats.count !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(rating => {
            const count = ratingDistribution[rating] || 0;
            const percentage = ratingStats.count > 0 
              ? (count / ratingStats.count) * 100 
              : 0;

            return (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-4">
                  {rating}
                </span>
                <RatingStars rating={1} maxRating={1} size="sm" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-6 mb-6">
          {displayedReviews.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Aún no hay reseñas para este abogado.
          </p>
          {canWriteReview && (
            <p className="text-gray-600 mt-2">
              ¡Sé el primero en dejar una reseña!
            </p>
          )}
        </div>
      )}

      {/* Show More Button */}
      {hasMoreReviews && !showAllReviews && (
        <div className="text-center mb-6">
          <Button
            variant="outline"
            onClick={() => setShowAllReviews(true)}
            className="w-full md:w-auto"
          >
            Ver Todas las Reseñas ({reviews.length - 3} más)
          </Button>
        </div>
      )}

      {/* Write Review Section */}
      {user && (
        <div className="pt-6 border-t border-gray-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Has trabajado con este abogado?
            </h3>
            <p className="text-gray-600 mb-4">
              Comparte tu experiencia para ayudar a otros clientes
            </p>
            <Button
              onClick={() => setShowWriteReview(true)}
              disabled={!canWriteReview}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Escribir Reseña
            </Button>
            {!canWriteReview && user && (
              <p className="text-sm text-gray-500 mt-4">
                Solo puedes reseñar abogados con los que has tenido consultas completadas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {showWriteReview && (
        <WriteReviewModal
          isOpen={showWriteReview}
          onClose={() => setShowWriteReview(false)}
          lawyerId={lawyerId}
          lawyerName={lawyerName}
          onSubmit={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
