import { Star, StarHalf, StarOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ratingService } from '@/services/ratingService';
import { Rating } from '@/types/rating';

interface RatingSummaryProps {
  lawyerId: string;
  averageRating: number;
  ratingCount: number;
  onRatingClick?: () => void;
}

export function RatingSummary({ 
  lawyerId, 
  averageRating = 0, 
  ratingCount = 0,
  onRatingClick 
}: RatingSummaryProps) {
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRatingDistribution() {
      try {
        // Get all ratings to calculate distribution
        const ratings = await ratingService.getRatingsByLawyer(lawyerId);
        
        // Initialize distribution array with zeros
        const distribution = [0, 0, 0, 0, 0];
        
        // Count ratings for each star level
        ratings.forEach(rating => {
          if (rating.rating >= 1 && rating.rating <= 5) {
            distribution[5 - rating.rating]++;
          }
        });
        
        setRatingDistribution(distribution);
      } catch (error) {
        console.error('Error fetching rating distribution:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRatingDistribution();
  }, [lawyerId, ratingCount]);

  // Calculate percentage for each star rating
  const calculatePercentage = (count: number) => {
    if (ratingCount === 0) return 0;
    return Math.round((count / ratingCount) * 100);
  };

  // Render stars based on the rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="w-5 h-5 text-yellow-400 fill-current" />);
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="w-5 h-5 text-yellow-400 fill-current" />);
    }
    
    // Add empty stars
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />);
    }
    
    return stars;
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h3 className="text-4xl font-bold text-gray-900">
            {averageRating.toFixed(1)}
            <span className="text-gray-500 text-2xl">/5</span>
          </h3>
          <div className="flex justify-center md:justify-start mt-1">
            {ratingCount > 0 ? (
              <div className="flex">
                {renderStars(averageRating)}
              </div>
            ) : (
              <div className="flex text-gray-400">
                <StarOff className="w-5 h-5" />
                <span className="ml-1 text-sm">Sin calificaciones</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {ratingCount} {ratingCount === 1 ? 'reseña' : 'reseñas'}
          </p>
        </div>
        
        <button
          onClick={onRatingClick}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Dejar una reseña
        </button>
      </div>
      
      {!isLoading && ratingCount > 0 && (
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars, index) => {
            const count = ratingDistribution[5 - stars] || 0;
            const percentage = calculatePercentage(count);
            
            return (
              <div key={stars} className="flex items-center">
                <div className="w-8 text-sm font-medium text-gray-900">
                  {stars}
                </div>
                <div className="w-4 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <div className="flex-1 mx-2 h-2.5 bg-gray-200 rounded-full">
                  <div 
                    className="h-2.5 bg-yellow-400 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-8 text-right text-sm text-gray-500">
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
