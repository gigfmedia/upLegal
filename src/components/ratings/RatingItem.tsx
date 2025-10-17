import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Rating } from '@/types/rating';

interface RatingItemProps {
  rating: Rating;
  showUser?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  currentUserId?: string;
}

export function RatingItem({ 
  rating, 
  showUser = true, 
  onEdit, 
  onDelete, 
  currentUserId 
}: RatingItemProps) {
  const isCurrentUser = currentUserId === rating.user_id;
  
  return (
    <div className="border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-start">
        {showUser && (
          <div className="flex-shrink-0 mr-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={rating.user?.avatar_url} 
                alt={rating.user?.name} 
              />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {rating.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {showUser && (
                <h4 className="text-sm font-medium text-gray-900 mr-2">
                  {rating.user?.name || 'Usuario anónimo'}
                </h4>
              )}
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < rating.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(rating.created_at), { 
                addSuffix: true, 
                locale: es 
              })}
            </span>
          </div>
          
          {rating.comment && (
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
              {rating.comment}
            </p>
          )}
          
          {isCurrentUser && (onEdit || onDelete) && (
            <div className="mt-2 flex space-x-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Editar
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
