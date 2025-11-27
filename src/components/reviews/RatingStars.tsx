import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  className?: string;
}

export function RatingStars({ 
  rating, 
  maxRating = 5, 
  size = 'md',
  showNumber = false,
  className 
}: RatingStarsProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const stars = Array.from({ length: maxRating }, (_, index) => {
    const starValue = index + 1;
    const isFilled = starValue <= Math.round(rating);
    
    return (
      <Star
        key={index}
        className={cn(
          sizeClasses[size],
          isFilled ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
        )}
      />
    );
  });

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {stars}
      {showNumber && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
