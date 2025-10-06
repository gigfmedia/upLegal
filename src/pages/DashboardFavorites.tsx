import { Helmet } from 'react-helmet-async';
import { FavoritesSection } from '@/components/dashboard/FavoritesSection';

export default function DashboardFavorites() {
  return (
    <>
      <Helmet>
        <title>Favoritos | upLegal</title>
      </Helmet>
      
      <div className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">Tus abogados favoritos</h2>
          <p className="text-muted-foreground">
            Aquí están los abogados que has guardado como favoritos
          </p>
        </div>
        
        <FavoritesSection />
      </div>
    </>
  );
}
