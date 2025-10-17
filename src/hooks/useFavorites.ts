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

  // Check if the current lawyer is in favorites by querying the favorites table directly
  const checkFavorite = useCallback(async () => {
    if (!user || !lawyerId) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('lawyer_id', lawyerId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking favorite:', error);
        setError('Error al verificar favoritos');
        return;
      }
      
      setIsFavorite(!!data);
    } catch (err) {
      console.error('Error checking favorite status:', err);
      setError('Error al verificar favoritos');
    }
  }, [user, lawyerId]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async () => {
    if (!user) return { error: 'Debes iniciar sesión para guardar favoritos' };
    if (!lawyerId) return { error: 'ID de abogado no válido' };
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .match({
            user_id: user.id,
            lawyer_id: lawyerId
          });
        
        if (deleteError) throw deleteError;
        setIsFavorite(false);
      } else {
        // Add to favorites
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            lawyer_id: lawyerId
          });
        
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
