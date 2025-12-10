import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define the Review type here since we're having issues with the import
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  email?: string;
}

export interface Review {
  id: string;
  lawyer_id: string;
  client_id: string;
  appointment_id: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  lawyer?: UserProfile;
  client?: UserProfile;
}

interface ReviewCardProps {
  review: Review;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ReviewCard({ review, onApprove, onReject }: ReviewCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${review.status === 'rejected' ? 'bg-gray-50' : 'bg-white'} shadow-sm`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">
                {review.client?.first_name || 'Usuario'} {review.client?.last_name || 'Anónimo'}
              </span>
              <span className="text-sm text-gray-500 ml-2">(Cliente)</span>
              
              {review.status !== 'pending' && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  review.status === 'approved' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {review.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {new Date(review.created_at).toLocaleDateString('es-CL')}
            </span>
          </div>
          
          <div className="mt-1 flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <span 
                key={star} 
                className={`${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </span>
            ))}
          </div>
          
          <p className="mt-2 text-gray-700">
            {review.comment}
          </p>
          
          <div className="mt-2 text-sm text-gray-500">
            Para: <span className="font-medium">
              {review.lawyer?.first_name} {review.lawyer?.last_name}
            </span>
          </div>
        </div>
        
        {review.status === 'pending' && (
          <div className="flex space-x-2 ml-4">
            <Button 
              variant="outline" 
              size="sm"
              className="text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => onApprove(review.id)}
            >
              <Check className="h-4 w-4 mr-1" /> Aprobar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-red-700 border-red-200 hover:bg-red-50"
              onClick={() => onReject(review.id)}
            >
              <X className="h-4 w-4 mr-1" /> Rechazar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
