import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Lawyer } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Heart, MapPin, Star, Briefcase, Clock, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type FavoriteLawyer = Lawyer & {
  favorite_id: string;
  rating_avg?: number;
  review_count?: number;
  hourlyRate?: number;
  consultationPrice?: number;
};

export function FavoritesSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedFavorite, setSelectedFavorite] = useState<{id: string, name: string} | null>(null);

  const { data: favorites, isLoading: isFavoritesLoading, error } = useQuery<FavoriteLawyer[]>({
    queryKey: ['favorites', user?.id],
    queryFn: async (): Promise<FavoriteLawyer[]> => {
      if (!user) return [];
      
      // First, get the favorites with lawyer details
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select(`
          id,
          lawyer_id,
          created_at,
          lawyer:lawyer_id (
            id,
            first_name,
            last_name,
            specialties,
            location,
            hourly_rate_clp,
            avatar_url,
            bio,
            verified,
            availability,
            review_count,
            rating
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        throw new Error('Error al cargar los favoritos');
      }

      if (!favoritesData || favoritesData.length === 0) {
        return [];
      }

      // Get all lawyer IDs to fetch their gigs
      const lawyerIds = favoritesData.map(fav => fav.lawyer_id).filter(Boolean) as string[];
      
      // Fetch gigs for all lawyers at once if we have any lawyers
      let gigsData = [];
      if (lawyerIds.length > 0) {
        const { data, error: gigsError } = await supabase
          .from('gigs')
          .select('lawyer_user_id, price_clp')
          .in('lawyer_user_id', lawyerIds);
          
        if (gigsError) {
          console.error('Error fetching gigs:', gigsError);
        } else if (data) {
          gigsData = data;
        }
      }

      // Create a map of lawyer_id to their gigs
      const gigsByLawyer = (gigsData || []).reduce<Record<string, Array<{ lawyer_user_id: string; price_clp: number }>>>((acc, gig) => {
        if (!acc[gig.lawyer_user_id]) {
          acc[gig.lawyer_user_id] = [];
        }
        acc[gig.lawyer_user_id].push(gig);
        return acc;
      }, {});

      // Map the data to the expected format
      return favoritesData
        .filter(fav => fav.lawyer) // Filter out any favorites without lawyer data
        .map(fav => {
          const lawyerGigs = fav.lawyer_id ? gigsByLawyer[fav.lawyer_id] || [] : [];
          const consultationPrice = lawyerGigs[0]?.price_clp || 0;
          
          return {
            ...fav.lawyer,
            favorite_id: fav.id,
            hourlyRate: fav.lawyer.hourly_rate_clp || 0,
            consultationPrice,
            review_count: fav.lawyer.review_count || 0,
            rating_avg: fav.lawyer.rating || 0,
            cases: [],
            availability: fav.lawyer.availability || {}
          } as FavoriteLawyer;
        });
    },
    enabled: !!user?.id,
  });

  const deleteFavorite = async () => {
    if (!selectedFavorite) return;
    
    setDeletingId(selectedFavorite.id);
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', selectedFavorite.id);

      if (error) throw error;
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      
      toast.success('Favorito eliminado correctamente');
    } catch (error) {
      console.error('Error deleting favorite:', error);
      toast.error('No se pudo eliminar el favorito');
    } finally {
      setDeletingId(null);
      setConfirmOpen(false);
      setSelectedFavorite(null);
    }
  };

  if (authLoading || isFavoritesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48">
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Error loading favorites:', error);
    return (
      <div className="text-center p-6">
        <p className="text-red-500">Error al cargar tus favoritos. Por favor, inténtalo de nuevo más tarde.</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-8 w-8 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes favoritos guardados</h3>
        <p className="text-gray-500 mb-6">Guarda abogados que te interesen para encontrarlos fácilmente después.</p>
        <Button onClick={() => navigate('/search')}>
          Buscar abogados
        </Button>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setSelectedFavorite(null);
          }
        }}
        onConfirm={deleteFavorite}
        title="¿Eliminar de favoritos?"
        description={`¿Estás seguro de que quieres eliminar a ${selectedFavorite?.name} de tus favoritos?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDeleting={!!deletingId}
      />
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((lawyer) => (
            <Card key={lawyer.favorite_id} className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {lawyer.first_name} {lawyer.last_name}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      {lawyer.specialties?.join(', ') || 'Abogado'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">
                      {lawyer.rating_avg?.toFixed(1) || 'Nuevo'}
                    </span>
                    {lawyer.review_count ? (
                      <span className="text-xs text-gray-500">
                        ({lawyer.review_count})
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <MapPin className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{lawyer.location || 'Sin ubicación'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center text-sm">
                    <Briefcase className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{formatPrice(lawyer.hourlyRate || 0)}/hora</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{formatPrice(lawyer.consultationPrice || 0)} consulta</span>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 flex items-center gap-2"
                    onClick={() => navigate(`/lawyer/${lawyer.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ver perfil</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFavorite({
                        id: lawyer.favorite_id,
                        name: `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim()
                      });
                      setConfirmOpen(true);
                    }}
                    disabled={!!deletingId}
                    aria-label="Eliminar de favoritos"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
