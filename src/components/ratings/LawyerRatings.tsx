import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Rating as RatingType } from '@/types/rating';
import { ratingService } from '@/services/ratingService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { RatingSummary } from './RatingSummary';
import { RatingItem } from './RatingItem';
import { RatingInput } from './RatingInput';
import { AppLoading } from '@/components/ui/AppLoading';

interface LawyerRatingsProps {
  lawyerId: string;
  averageRating: number;
  ratingCount: number;
  onRatingUpdate?: (newAverage: number, newCount: number) => void;
  className?: string;
}

export function LawyerRatings({
  lawyerId,
  averageRating = 0,
  ratingCount = 0,
  onRatingUpdate,
  className = ''
}: LawyerRatingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ratings, setRatings] = useState<RatingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [userRating, setUserRating] = useState<RatingType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch ratings
  useEffect(() => {
    let isMounted = true;
    
    async function loadRatings() {
      try {
        setIsLoading(true);
        const data = await ratingService.getRatingsByLawyer(lawyerId);
        
        if (isMounted) {
          setRatings(data);
          
          // Check if current user has already rated
          if (user) {
            try {
              const userRating = await ratingService.getUserRating(lawyerId, user.id);
              if (isMounted) {
                setUserRating(userRating);
              }
            } catch (error) {
              console.error('Error loading user rating:', error);
              // Don't show error toast here as it might be expected if user hasn't rated yet
            }
          }
        }
      } catch (error) {
        console.error('Error loading ratings:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'No se pudieron cargar las calificaciones. Por favor, inténtalo de nuevo.',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadRatings();
    
    return () => {
      isMounted = false;
    };
  }, [lawyerId, user]);

  // Handle rating submission
  const handleRatingSubmit = async () => {
    // Refresh ratings after submission
    const stats = await ratingService.getLawyerRatingStats(lawyerId);
    onRatingUpdate?.(stats.average, stats.count);
    
    // Refresh user's rating
    if (user) {
      const updatedUserRating = await ratingService.getUserRating(lawyerId, user.id);
      setUserRating(updatedUserRating);
    }
    
    // Refresh ratings list
    const updatedRatings = await ratingService.getRatingsByLawyer(lawyerId);
    setRatings(updatedRatings);
    
    // Close dialog
    setShowRatingDialog(false);
  };

  // Handle rating deletion
  const handleDeleteRating = async () => {
    if (!userRating?.id || !user) return;
    
    try {
      setIsDeleting(true);
      await ratingService.deleteRating(userRating.id, user.id);
      
      // Update UI
      setUserRating(null);
      const updatedRatings = ratings.filter(r => r.id !== userRating.id);
      setRatings(updatedRatings);
      
      // Update stats
      const stats = await ratingService.getLawyerRatingStats(lawyerId);
      onRatingUpdate?.(stats.average, stats.count);
      
      toast({
        title: 'Calificación eliminada',
        description: 'Tu calificación ha sido eliminada correctamente.',
      });
    } catch (error) {
      console.error('Error deleting rating:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la calificación. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowRatingDialog(false);
    }
  };

  // Toggle rating dialog
  const toggleRatingDialog = () => {
    setShowRatingDialog(!showRatingDialog);
  };

  return (
    <div className={className}>
      <RatingSummary
        lawyerId={lawyerId}
        averageRating={averageRating}
        ratingCount={ratingCount}
        onRatingClick={toggleRatingDialog}
      />
      
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Reseñas de clientes ({ratingCount})
          </h3>
          
          {user && !userRating && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleRatingDialog}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Escribe una reseña
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <AppLoading fullScreen={false} className="py-12" />
        ) : ratings.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <p className="text-gray-500">No hay reseñas aún. Sé el primero en opinar.</p>
            {user && (
              <Button
                variant="link"
                onClick={toggleRatingDialog}
                className="mt-2 text-blue-600"
              >
                Escribe la primera reseña
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {ratings.map((rating) => (
              <RatingItem
                key={rating.id}
                rating={rating}
                currentUserId={user?.id}
                onEdit={() => {
                  setUserRating(rating);
                  setShowRatingDialog(true);
                }}
                onDelete={() => {
                  if (confirm('¿Estás seguro de que deseas eliminar tu calificación?')) {
                    handleDeleteRating();
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Rating Dialog */}
      <Dialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        aria-labelledby="rating-dialog-title"
        aria-describedby="rating-dialog-description"
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle id="rating-dialog-title">Deja tu reseña</DialogTitle>
            <DialogDescription id="rating-dialog-description">
              Comparte tu experiencia con este abogado para ayudar a otros usuarios.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <RatingInput
              lawyerId={lawyerId}
              onCancel={() => setShowRatingDialog(false)}
              initialRating={userRating?.rating}
              initialComment={userRating?.comment}
              isEditing={!!userRating}
              ratingId={userRating?.id}
            />
            
            {userRating && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={handleDeleteRating}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar calificación'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
