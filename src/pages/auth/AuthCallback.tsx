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

        // Check for redirectTo in URL params
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get('redirectTo');
        
        if (error) {
          console.error('Error getting session:', error);
          navigate('/?login=true');
          return;
        }

        if (session) {
          if (redirectTo) {
            navigate(decodeURIComponent(redirectTo), { replace: true });
            return;
          }

          // Check profile to determine redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          // If repair is needed, it happens in useAuthState. 
          // We can wait a moment or check if profile matches metadata
          
          if (profile?.role === 'lawyer' || session.user.user_metadata?.role === 'lawyer') {
             navigate('/lawyer/dashboard');
          } else {
             navigate('/dashboard'); 
          }
        } else {
          navigate('/?login=true');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/?login=true');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-900" />
        <h2 className="text-xl font-semibold mb-2">Verificando tu cuenta...</h2>
        <p className="text-gray-600">Estamos configurando tu entorno, esto tomará un momento.</p>
      </div>
    </div>
  );
}
