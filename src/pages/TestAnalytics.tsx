import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

type PageView = {
  id: string;
  page_path: string;
  page_title: string;
  user_id: string | null;
  created_at: string;
  user_agent: string;
  referrer: string | null;
};

export default function TestAnalytics() {
  const [views, setViews] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPageViews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from<PageView>('page_views')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setViews(data || []);
    } catch (err) {
      console.error('Error fetching page views:', err);
      setError(err.message || 'Error al cargar las vistas de página');
    } finally {
      setLoading(false);
    }
  };

  const testPageView = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error: insertError } = await supabase
        .from('page_views')
        .insert([
          {
            page_path: '/test',
            page_title: 'Página de prueba',
            user_agent: 'Test User Agent',
            referrer: 'https://example.com'
          }
        ]);

      if (insertError) throw insertError;
      
      // Refresh the view
      await fetchPageViews();
      
      alert('Vista de página de prueba registrada correctamente');
    } catch (err) {
      console.error('Error testing page view:', err);
      setError(err.message || 'Error al registrar la vista de página de prueba');
    } finally {
      setLoading(false);
    }
  };

  // Load page views on component mount
  useEffect(() => {
    fetchPageViews();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Prueba de Análisis</h1>
      
      <div className="space-y-4 mb-8">
        <div className="flex space-x-4">
          <Button onClick={testPageView} disabled={loading}>
            {loading ? 'Procesando...' : 'Probar Registro de Página'}
          </Button>
          <Button variant="outline" onClick={fetchPageViews} disabled={loading}>
            {loading ? 'Cargando...' : 'Actualizar Datos'}
          </Button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-lg font-medium">Registros de Páginas Vistas</h2>
          <p className="text-sm text-gray-500">
            {views.length} registros encontrados
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Página
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {views.length > 0 ? (
                views.map((view) => (
                  <tr key={view.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(view.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {view.page_path}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {view.page_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {view.user_id || 'Anónimo'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    {loading ? 'Cargando...' : 'No se encontraron registros'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
