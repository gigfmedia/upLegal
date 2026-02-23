import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

interface EditReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: {
    id: string;
    rating: number;
    comment: string | null;
    client: {
      display_name: string;
      avatar_url?: string;
    };
    lawyer: {
      id: string;
      first_name: string;
      last_name: string;
    };
  };
  onUpdate: (reviewId: string, updates: { comment: string }) => void;
}

export function EditReviewModal({ isOpen, onClose, review, onUpdate }: EditReviewModalProps) {
  const [editedComment, setEditedComment] = useState(review.comment || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      await onUpdate(review.id, { comment: editedComment });
      
      toast({
        title: 'Reseña actualizada',
        description: 'La reseña ha sido actualizada correctamente',
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la reseña',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Reseña</DialogTitle>
          <DialogDescription>
            Corrige faltas de ortografía y mejora la claridad de la reseña.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Review Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Cliente:</span>
                <p>{review.client.display_name}</p>
              </div>
              <div>
                <span className="font-medium">Abogado:</span>
                <p>{review.lawyer.first_name} {review.lawyer.last_name}</p>
              </div>
              <div>
                <span className="font-medium">Calificación:</span>
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-lg ${
                          star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Comentario de la reseña
            </label>
            <Textarea
              id="comment"
              value={editedComment}
              onChange={(e) => setEditedComment(e.target.value)}
              placeholder="Edita el comentario para corregir faltas de ortografía..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
