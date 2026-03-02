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
    console.log(`📧 Enviando invitación a: ${email}`);
    
    // Generar contraseña genérica por si acaso
    const genericPassword = generatePassword();
    console.log(`🔑 Contraseña generada: ${genericPassword}`);
    
    // Crear invitación con rol lawyer en user_metadata
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          role: 'lawyer',
          full_name: lawyerName || '',
          invited_at: new Date().toISOString()
        }
      }
    );

    if (error) {
      console.error('❌ Error al invitar abogado:', error);
      throw error;
    }

    console.log('✅ Invitación enviada exitosamente:', data);
    console.log(`📋 Resumen:`);
    console.log(`   - Email: ${email}`);
    console.log(`   - Rol: lawyer`);
    console.log(`   - Contraseña temporal: ${genericPassword}`);
    console.log(`   - Estado: Pendiente de aceptación`);
    
    return {
      success: true,
      email,
      role: 'lawyer',
      temporaryPassword: genericPassword,
      inviteData: data
    };

  } catch (error: unknown) {
    console.error('❌ Error en el proceso de invitación:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Ejemplos de uso
async function main() {
  // Ejemplo 1: Invitar a un abogado específico
  const result1 = await inviteLawyer('nuevo.abogado@ejemplo.com', 'Juan Pérez');
  
  if (result1.success) {
    console.log('🎉 Abogado invitado correctamente');
  } else {
    console.log('💥 Falló la invitación:', result1.error);
  }

  // Ejemplo 2: Invitar a múltiples abogados
  const lawyersToInvite = [
    { email: 'maria.gonzalez@legal.cl', name: 'María González' },
    { email: 'carlos.rodriguez@abogados.cl', name: 'Carlos Rodríguez' },
    { email: 'ana.martinez@legal.cl', name: 'Ana Martínez' }
  ];

  console.log('\n📋 Invitando múltiples abogados...');
  for (const lawyer of lawyersToInvite) {
    const result = await inviteLawyer(lawyer.email, lawyer.name);
    console.log(`   ${lawyer.email}: ${result.success ? '✅' : '❌'}`);
  }
}

// Exportar funciones para uso en otros módulos
export { inviteLawyer, generatePassword };
