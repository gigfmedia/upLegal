import { Helmet } from 'react-helmet-async';
import { FavoritesSection } from '@/components/dashboard/FavoritesSection';

export default function DashboardFavorites() {
  return (
    <>
      <Helmet>
        <title>Favoritos | upLegal</title>
      </Helmet>
      
      <div className="container mx-auto px-8 py-6 space-y-6">
        <div className="">
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
