'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { Button } from '@/components/ui/button';
import { Heart, MapPin, Star, Briefcase, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '@/lib/utils';
import { Lawyer } from '../LawyerCard';

type FavoriteLawyer = Lawyer & {
  favorite_id: string;
};

export function UpdatedFavoritesSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First, get the favorite records for the current user
      const { data: favoritesData, error: favError } = await supabase
        .from('favorites')
        .select('id, lawyer_id')
        .eq('user_id', user.id);

      if (favError) {
        console.error('Error fetching favorites:', favError);
        throw favError;
      }

      if (!favoritesData || favoritesData.length === 0) {
        return [];
      }

      // Get the lawyer IDs from the favorites
      const lawyerIds = favoritesData.map(fav => fav.lawyer_id);

      // Then, get the lawyer details for each favorite
      const { data: lawyersData, error: lawyersError } = await supabase
        .from('lawyers')
        .select('*')
        .in('id', lawyerIds);

      if (lawyersError) {
        console.error('Error fetching lawyers:', lawyersError);
        throw lawyersError;
      }

      // Combine the favorite ID with the lawyer data
      return favoritesData.map(fav => {
        const lawyer = lawyersData.find(l => l.id === fav.lawyer_id);
        return lawyer ? { ...lawyer, favorite_id: fav.id } : null;
      }).filter(Boolean) as FavoriteLawyer[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Error al cargar tus favoritos. Por favor, inténtalo de nuevo más tarde.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Heart className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay favoritos</h3>
        <p className="mt-1 text-sm text-gray-500">Empieza agregando abogados a tus favoritos para verlos aquí.</p>
        <div className="mt-6">
          <Button onClick={() => navigate('/search')}>
            Buscar abogados
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {favorites.map((lawyer) => (
          <Card key={lawyer.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="relative">
                    <img
                      className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm"
                      src={lawyer.image || '/placeholder-user.jpg'}
                      alt={lawyer.name}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{lawyer.name}</h3>
                    <div className="flex items-center mt-1 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      <span>{lawyer.location || 'Ubicación no disponible'}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-gray-600">
                        {lawyer.rating} ({lawyer.reviews} reseñas)
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const { error } = await supabase
                        .from('favorites')
                        .delete()
                        .eq('id', lawyer.favorite_id);
                      
                      if (error) throw error;
                      // The query will automatically refetch due to the query key
                    } catch (err) {
                      console.error('Error removing favorite:', err);
                    }
                  }}
                >
                  <Heart className="h-5 w-5 fill-current" />
                </Button>
              </div>
              
              <div className="mt-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {lawyer.specialties?.slice(0, 3).map((specialty, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {specialty}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-sm text-gray-500">Tarifa por hora</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${formatPrice(lawyer.hourlyRate)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/lawyer/${lawyer.id}`)}
                  >
                    Ver perfil
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
