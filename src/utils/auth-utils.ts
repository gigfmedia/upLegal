import { supabase } from '@/lib/supabase';

export async function handlePasswordReset() {
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  
  if (code) {
    try {
      // Get email from URL or prompt user to enter it
      const email = prompt('Por favor ingresa tu correo electrónico para continuar con el restablecimiento de contraseña:');
      if (!email) return { success: false, error: 'Se requiere correo electrónico' };
      
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery'
      });
      
      if (error) throw error;
      
      // Clear the code from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('code');
      window.history.replaceState({}, '', newUrl.toString());
      
      return { success: true };
    } catch (error) {
      console.error('Error confirming password reset:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al procesar el restablecimiento de contraseña' 
      };
    }
  }
  
  return { success: false, error: 'No se encontró el código de restablecimiento' };
}

export async function sendPasswordResetEmail(email: string) {
  try {
    const appUrl = (import.meta as any)?.env?.VITE_APP_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al enviar el correo de restablecimiento' 
    };
  }
}
