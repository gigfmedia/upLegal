/**
 * Script para verificar manualmente el estado de un correo electrónico en Supabase
 * 
 * Este script verifica si un correo electrónico está verificado en Supabase
 * sin necesidad de autenticación directa con la API de administración.
 */

async function checkEmailVerificationStatus(email: string) {
  try {
    // 1. Verificar si el usuario está autenticado
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('🔐 No hay sesión activa. Iniciando sesión...');
      await signInWithEmail('gabignaciagomez@gmail.com');
      return;
    }
    
    // 2. Obtener el perfil del usuario autenticado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
      
    if (profileError) throw profileError;
    
    console.log('📋 Perfil encontrado:');
    console.log('- ID:', profile.id);
    console.log('- Email:', profile.email);
    console.log('- Verificado:', profile.email_confirmed_at ? 'Sí' : 'No');
    
  } catch (error) {
    console.error('❌ Error al verificar el correo:', error);
  }
}

// Ejecutar la verificación
checkEmailVerificationStatus('gabignaciagomez@gmail.com');
