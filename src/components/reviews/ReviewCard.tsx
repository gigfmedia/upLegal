import { useState } from 'react';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    user: {
      id: string;
      display_name: string;
      avatar_url?: string;
    };
    service_type?: string;
    helpful_count?: number;
  };
  onHelpful?: (reviewId: string) => void;
  onReply?: (reviewId: string) => void;
}

export function ReviewCard({ review, onHelpful, onReply }: ReviewCardProps) {
  const [isHelpful, setIsHelpful] = useState(false);
  
  const handleHelpful = () => {
    setIsHelpful(!isHelpful);
    onHelpful?.(review.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const timeAgo = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: false,
    locale: es
  });

  return (
    <div className="border-b border-gray-200 pb-6 last:border-0">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {review.user.avatar_url ? (
            <img
              src={review.user.avatar_url}
              alt={review.user.display_name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {getInitials(review.user.display_name)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900">
                  {review.user.display_name}
                </h4>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Verificado
                </span>
              </div>
              {review.service_type && (
                <p className="text-sm text-gray-600 mb-2">{review.service_type}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <RatingStars rating={review.rating} size="sm" />
              <span className="text-xs text-gray-500">{timeAgo}</span>
            </div>
          </div>

          {review.comment && (
            <p className="text-gray-700 mt-3 leading-relaxed">
              {review.comment}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant="ghost"
              size="sm"
              className={`text-gray-600 hover:text-gray-900 ${isHelpful ? 'text-blue-600' : ''}`}
              onClick={handleHelpful}
            >
              <ThumbsUp className={`h-4 w-4 mr-1 ${isHelpful ? 'fill-current' : ''}`} />
              Útil {review.helpful_count ? `(${review.helpful_count})` : ''}
            </Button>
            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
                onClick={() => onReply(review.id)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Responder
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
