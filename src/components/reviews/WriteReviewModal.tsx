import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { ratingService } from '@/services/ratingService';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawyerId: string;
  lawyerName: string;
  onSubmit: () => void;
}

export function WriteReviewModal({
  isOpen,
  onClose,
  lawyerId,
  lawyerName,
  onSubmit
}: WriteReviewModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para escribir una reseña',
        variant: 'destructive'
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Calificación requerida',
        description: 'Por favor selecciona una calificación',
        variant: 'destructive'
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: 'Comentario requerido',
        description: 'Por favor escribe un comentario sobre tu experiencia',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await ratingService.createRating(
        {
          lawyerId: lawyerId,
          rating,
          comment: comment.trim()
        },
        user.id
      );

      toast({
        title: '¡Reseña publicada!',
        description: 'Gracias por compartir tu experiencia',
      });

      onSubmit();
      handleClose();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo publicar la reseña. Intenta nuevamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setComment('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Escribir Reseña</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia con {lawyerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Calificación *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  <Star
                    className={cn(
                      'h-10 w-10 transition-colors',
                      (hoveredRating >= value || rating >= value)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {rating === 5 && 'Excelente'}
                  {rating === 4 && 'Muy bueno'}
                  {rating === 3 && 'Bueno'}
                  {rating === 2 && 'Regular'}
                  {rating === 1 && 'Malo'}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Tu experiencia *
            </label>
            <Textarea
              id="comment"
              placeholder="Cuéntanos sobre tu experiencia con este abogado. ¿Qué te pareció su atención, profesionalismo y resultados?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/1000 caracteres
            </p>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Pautas para reseñas
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Sé honesto y específico sobre tu experiencia</li>
              <li>• Evita lenguaje ofensivo o inapropiado</li>
              <li>• No compartas información personal sensible</li>
              <li>• Enfócate en el servicio profesional recibido</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0 || !comment.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              'Publicar Reseña'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
