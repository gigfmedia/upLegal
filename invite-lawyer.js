import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuración del cliente de Supabase con service role key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Función para generar contraseña genérica
function generatePassword(length = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Función para invitar abogado
async function inviteLawyer(email: string, lawyerName?: string) {
  try {
    // Generar contraseña genérica por si acaso
    const genericPassword = generatePassword();
    
    // Crear invitación con rol lawyer en user_metadata
    const { data, error } = await supabase.auth.admin.inviteUserByEmail({
      email,
      data: {
        role: 'lawyer',
        full_name: lawyerName || '',
        invited_at: new Date().toISOString()
      }
    });

    if (error) {
      console.error('❌ Error al invitar abogado:', error);
      throw error;
    }
    
    return {
      success: true,
      email,
      role: 'lawyer',
      temporaryPassword: genericPassword,
      inviteData: data
    };

  } catch (error: any) {
    console.error('❌ Error en el proceso de invitación:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejemplos de uso
async function main() {
  // Ejemplo 1: Invitar a un abogado específico
  const result1 = await inviteLawyer('nuevo.abogado@ejemplo.com', 'Juan Pérez');
  
  if (result1.success) {
    //console.log('🎉 Abogado invitado correctamente');
  } else {
    //console.log('💥 Falló la invitación:', result1.error);
  }

  // Ejemplo 2: Invitar a múltiples abogados
  const lawyersToInvite = [
    { email: 'maria.gonzalez@legal.cl', name: 'María González' },
    { email: 'carlos.rodriguez@abogados.cl', name: 'Carlos Rodríguez' },
    { email: 'ana.martinez@legal.cl', name: 'Ana Martínez' }
  ];

  for (const lawyer of lawyersToInvite) {
    const result = await inviteLawyer(lawyer.email, lawyer.name);
  }
}

// Exportar funciones para uso en otros módulos
export { inviteLawyer, generatePassword };
