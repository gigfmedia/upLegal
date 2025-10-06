import { Heart, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useFavorites } from '../hooks/useFavorites';
import { useToast } from './ui/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface FavoriteButtonProps {
  lawyerId: string;
  showText?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onAuthRequired?: () => void;
  className?: string;
}

export function FavoriteButton({
  lawyerId,
  showText = true,
  size = 'icon',
  variant = 'ghost',
  onAuthRequired,
  className = '',
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, isLoading, error } = useFavorites(lawyerId);

  const handleClick = async () => {
    if (!user) {
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    const { error: toggleError } = await toggleFavorite();
    
    if (toggleError) {
      toast({
        title: 'Error',
        description: toggleError,
        variant: 'destructive',
      });
    } else {
      toast({
        title: isFavorite ? 'Eliminado de favoritos' : 'Añadido a favoritos',
        description: isFavorite 
          ? 'El abogado ha sido eliminado de tus favoritos' 
          : 'El abogado ha sido añadido a tus favoritos',
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={`group ${className} ${isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-red-500'}`}
      aria-label={isFavorite ? 'Eliminar de favoritos' : 'Añadir a favoritos'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart 
          className={`h-4 w-4 ${isFavorite ? 'fill-current' : 'group-hover:fill-red-500'}`} 
        />
      )}
      {showText && (
        <span className="ml-2">
          {isFavorite ? 'Eliminar de favoritos' : 'Añadir a favoritos'}
        </span>
      )}
    </Button>
  );
}
