import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Lawyer } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Heart, MapPin, Star, Briefcase, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '@/lib/utils';

type FavoriteLawyer = Lawyer & {
  favorite_id: string;
  rating_avg?: number;
  review_count?: number;
};

export function FavoritesSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: favorites, isLoading, error } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          lawyer:lawyer_id (
            id,
            first_name,
            last_name,
            specialization,
            hourly_rate,
            consultation_fee,
            location,
            avatar_url,
            bio,
            languages,
            rating_avg,
            review_count
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(item => ({
        ...item.lawyer,
        favorite_id: item.id,
      })) as FavoriteLawyer[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
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
    return (
      <div className="text-center p-6">
        <p className="text-red-500">Error al cargar tus favoritos. Por favor, inténtalo de nuevo más tarde.</p>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes favoritos guardados</h3>
        <p className="text-gray-500 mb-6">Guarda abogados que te interesen para encontrarlos fácilmente después.</p>
        <Button onClick={() => navigate('/search')}>
          Buscar abogados
        </Button>
      </div>
    );
  }

  return (
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
                  <p className="text-sm text-gray-500">{lawyer.specialization}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">
                    {lawyer.rating_avg?.toFixed(1) || 'Nuevo'}
                  </span>
                  {lawyer.review_count && (
                    <span className="text-xs text-gray-500">
                      ({lawyer.review_count})
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
                <span>{lawyer.location || 'Ubicación no especificada'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center text-sm">
                  <Briefcase className="h-4 w-4 mr-1.5 text-gray-400" />
                  <span>{formatPrice(lawyer.hourly_rate)}/hora</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                  <span>{formatPrice(lawyer.consultation_fee)} consulta</span>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/lawyers/${lawyer.id}`)}
                >
                  Ver perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default FavoritesSection;
