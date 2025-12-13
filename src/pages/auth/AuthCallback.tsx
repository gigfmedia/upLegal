import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Redirect to home with login modal open
          navigate('/?login=true');
          return;
        }

        if (session) {
          // User is authenticated, redirect to home
          // User is authenticated, but we redirect to home with login modal open as requested
          navigate('/?login=true');
        } else {
          // No session, redirect to home with login modal open
          navigate('/?login=true');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        // Redirect to home with login modal open on error
        navigate('/?login=true');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Verificando tu cuenta...</p>
      </div>
    </div>
  );
}
