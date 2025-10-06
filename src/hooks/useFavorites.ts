import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '@/types/supabase';

type Favorite = Database['public']['Tables']['favorites']['Insert'];

export function useFavorites(lawyerId?: string) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if the current lawyer is in favorites using the is_favorited function
  const checkFavorite = useCallback(async () => {
    if (!user || !lawyerId) return;
    
    try {
      const { data: isFavorited, error } = await supabase
        .rpc('is_favorited', { 
          p_user_id: user.id, 
          p_lawyer_id: lawyerId 
        });
      
      if (error) throw error;
      
      setIsFavorite(!!isFavorited);
    } catch (err) {
      console.error('Error checking favorite status:', err);
      setError('Error al verificar favoritos');
    }
  }, [user, lawyerId]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async () => {
    if (!user) return { error: 'Debes iniciar sesión para guardar favoritos' };
    if (!lawyerId) return { error: 'ID de abogado no válido' };
    
    // Ensure lawyerId is treated as a string
    const lawyerIdStr = String(lawyerId);
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('lawyer_id', lawyerIdStr);
        
        if (deleteError) throw deleteError;
        setIsFavorite(false);
      } else {
        // Add to favorites
        const newFavorite: Favorite = { 
          user_id: user.id, 
          lawyer_id: lawyerIdStr
        };
        
        const { error: insertError } = await supabase
          .from('favorites')
          .insert(newFavorite);
        
        if (insertError) throw insertError;
        setIsFavorite(true);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error toggling favorite:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar favoritos';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user, lawyerId, isFavorite]);

  // Check favorite status on mount and when user or lawyerId changes
  useEffect(() => {
    checkFavorite();
  }, [checkFavorite]);

  return {
    isFavorite,
    toggleFavorite,
    isLoading,
    error
  };
}
