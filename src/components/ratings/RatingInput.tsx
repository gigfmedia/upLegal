import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ratingService } from '@/services/ratingService';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

interface RatingInputProps {
  lawyerId: string;
  onRatingSubmit?: () => void;
  onCancel?: () => void;
  initialRating?: number;
  initialComment?: string;
  isEditing?: boolean;
  ratingId?: string;
}

export function RatingInput({
  lawyerId,
  onRatingSubmit,
  onCancel,
  initialRating = 0,
  initialComment = '',
  isEditing = false,
  ratingId
}: RatingInputProps) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setRating(initialRating);
    setComment(initialComment);
  }, [initialRating, initialComment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      if (isEditing && ratingId) {
        await ratingService.updateRating(ratingId, { rating, comment }, user.id);
        toast({
          title: '¡Calificación actualizada!',
          description: 'Tu calificación ha sido actualizada correctamente.',
        });
      } else {
        await ratingService.createRating({
          lawyerId,
          rating,
          comment: comment || undefined
        }, user.id);
        
        toast({
          title: '¡Gracias por tu calificación!',
          description: 'Tu opinión es muy importante para nosotros.',
        });
      }
      
      onRatingSubmit?.();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar tu calificación. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center">
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${
                (hover || rating) >= star ? 'text-yellow-400' : 'text-gray-300'
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(rating)}
            >
              <Star className="w-8 h-8 fill-current" />
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {rating === 0 ? 'Selecciona una calificación' : `${rating} estrella${rating !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="comment" className="text-sm font-medium">
          {isEditing ? 'Actualiza tu reseña (opcional)' : '¿Qué te pareció el servicio? (opcional)'}
        </label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comparte tu experiencia con este abogado..."
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={rating === 0 || isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar calificación' : 'Enviar calificación'}
        </Button>
      </div>
    </form>
  );
}
