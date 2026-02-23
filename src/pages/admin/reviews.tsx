import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { Loader2, Check, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { ReviewCard } from '@/components/admin/ReviewCard';
import { EditReviewModal } from '@/components/admin/EditReviewModal';
import type { Review } from '@/types/review';
import Header from '@/components/Header';

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const { toast } = useToast();

  const loadReviews = useCallback(async (isInitialLoad = false) => {
    try {
      setLoading(true);
      const supabase = getSupabaseAdminClient();
      
      // Load all reviews (not filtered by lawyer)
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          lawyer:lawyer_id (id, first_name, last_name, avatar_url, email),
          client:client_id (id, first_name, last_name, avatar_url, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data as Review[]) || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las reseñas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      if (isInitialLoad) {
        setInitialLoad(false);
      }
    }
  }, [toast]);

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const isAdmin = user.is_admin === true ||
                   user.user_metadata?.is_admin === true ||
                   user.email?.toLowerCase() === 'gigfmedia@icloud.com' ||
                   user.role === 'admin';
    
    if (!isAdmin) {
      console.log('User is not admin, redirecting to home. User data:', {
        email: user.email,
        is_admin: user.is_admin,
        user_metadata: user.user_metadata,
        role: user.role
      });
      toast({
        title: 'Acceso denegado',
        description: 'No tienes permisos de administrador',
        variant: 'destructive',
      });
      navigate('/');
    } else if (initialLoad) {
      // Only load reviews on initial load
      loadReviews(true);
    }
  }, [user, navigate, toast, initialLoad, loadReviews]);

  const updateReviewStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .from('reviews')
        .update({ status })
        .eq('id', reviewId);

      if (error) throw error;
      
      toast({
        title: 'Éxito',
        description: `Reseña ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente`,
      });

      // Refresh the list
      loadReviews();
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la reseña',
        variant: 'destructive',
      });
    }
  };

  const updateReviewContent = async (reviewId: string, updates: { comment: string }) => {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .from('reviews')
        .update({ 
          comment: updates.comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;
      
      toast({
        title: 'Reseña actualizada',
        description: 'La reseña ha sido actualizada correctamente',
      });

      // Refresh list
      loadReviews();
    } catch (error) {
      console.error('Error updating review content:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el contenido de la reseña',
        variant: 'destructive',
      });
    }
  };

  const mockReviews: Review[] = [
    {
      id: 'mock-1',
      lawyer_id: 'lawyer-1',
      client_id: 'client-1',
      appointment_id: 'app-1',
      rating: 5,
      comment: 'Excelente abogado, muy profesional y atento. Me ayudó mucho con mi caso de propiedad intelectual. Lo recomiendo ampliamente.',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lawyer: {
        id: 'lawyer-1',
        first_name: 'María',
        last_name: 'González',
        email: 'maria@example.com'
      },
      client: {
        id: 'client-1',
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@example.com'
      }
    },
    {
      id: 'mock-2',
      lawyer_id: 'lawyer-2',
      client_id: 'client-2',
      appointment_id: 'app-2',
      rating: 4,
      comment: 'Muy buen servicio, resolvió mi problema de manera rápida y efectiva. Muy recomendable.',
      status: 'approved',
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      lawyer: {
        id: 'lawyer-2',
        first_name: 'Carlos',
        last_name: 'López',
        email: 'carlos@example.com'
      },
      client: {
        id: 'client-2',
        first_name: 'Ana',
        last_name: 'Martínez',
        email: 'ana@example.com'
      }
    },
    {
      id: 'mock-3',
      lawyer_id: 'lawyer-3',
      client_id: 'client-3',
      appointment_id: 'app-3',
      rating: 1,
      comment: 'No me gustó el servicio, no resolvió mi problema.',
      status: 'rejected',
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      updated_at: new Date(Date.now() - 172800000).toISOString(),
      lawyer: {
        id: 'lawyer-3',
        first_name: 'Pedro',
        last_name: 'Sánchez',
        email: 'pedro@example.com'
      },
      client: {
        id: 'client-3',
        first_name: 'Usuario',
        last_name: 'Anónimo',
        email: 'anon@example.com'
      }
    }
  ];

  const displayReviews = reviews;

  const handleEdit = (review: Review) => {
    setEditingReview(review);
  };

  const handleCloseEditModal = () => {
    setEditingReview(null);
  };

  const handleApprove = (reviewId: string) => {
    console.log('Approving review:', reviewId);
    updateReviewStatus(reviewId, 'approved');
  };

  const handleReject = (reviewId: string) => {
    console.log('Rejecting review:', reviewId);
    updateReviewStatus(reviewId, 'rejected');
  };
  
  const handleRefreshClick = () => {
    loadReviews(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
    <Header />
      <div className="min-h-screen bg-slate-50 pt-20 pb-10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="outline" className="mb-2">
                  Panel interno
                </Badge>
                <h1 className="text-3xl font-bold text-slate-900">Gestión de Reseñas</h1>
                <p className="text-slate-500">
                  Monitorea las reseñas hacia los abogados, aprueba o rechaza.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefreshClick}
                disabled={loading}
                className="mt-2"
              >
                {loading ? 'Cargando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
          
          {displayReviews.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No hay reseñas pendientes de revisión</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayReviews.map((review) => (
                <ReviewCard 
                  key={review.id} 
                  review={review} 
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Review Modal */}
      {editingReview && (
        <EditReviewModal
          isOpen={true}
          review={editingReview}
          onClose={handleCloseEditModal}
          onUpdate={updateReviewContent}
        />
      )}
    </div>
  );
}
