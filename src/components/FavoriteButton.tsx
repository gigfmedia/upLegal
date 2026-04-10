import { Bookmark, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useFavorites } from '../hooks/useFavorites';
import { useToast } from './ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "./ui/tooltip";

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
        title: isFavorite ? 'Eliminado de guardados' : 'Abogado guardado',
        description: isFavorite 
          ? 'El abogado ha sido eliminado de tus elementos guardados' 
          : 'El abogado ha sido guardado exitosamente',
      });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={isLoading}
            className={`group transition-all duration-200 ${isFavorite ? 'text-green-900 hover:bg-green-50' : 'text-gray-400 hover:text-green-900 hover:bg-gray-100'} ${className}`}
            aria-label={isFavorite ? 'Eliminar de guardados' : 'Guardar abogado'}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bookmark 
                className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} 
              />
            )}
            {showText && (
              <span className="ml-2">
                {isFavorite ? 'Eliminado de guardados' : 'Guardar abogado'}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isFavorite ? 'Eliminar de guardados' : 'Guardar Abogado'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
