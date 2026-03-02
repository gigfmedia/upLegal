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

// Función para invitar usuario (lawyer o client)
async function inviteUser(email: string, role: 'lawyer' | 'client', userName?: string) {
  try {
    console.log(`📧 Enviando invitación a: ${email} (rol: ${role})`);
    
    // Generar contraseña genérica por si acaso
    const genericPassword = generatePassword();
    console.log(`🔑 Contraseña generada: ${genericPassword}`);
    
    // Crear invitación con rol especificado en user_metadata
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          role: role,
          full_name: userName || '',
          invited_at: new Date().toISOString()
        }
      }
    );

    if (error) {
      console.error(`❌ Error al invitar ${role}:`, error);
      throw error;
    }

    console.log('✅ Invitación enviada exitosamente:', data);
    console.log(`📋 Resumen:`);
    console.log(`   - Email: ${email}`);
    console.log(`   - Rol: ${role}`);
    console.log(`   - Contraseña temporal: ${genericPassword}`);
    console.log(`   - Estado: Pendiente de aceptación`);
    
    return {
      success: true,
      email,
      role,
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

// Funciones específicas para mantener compatibilidad
async function inviteLawyer(email: string, lawyerName?: string) {
  return inviteUser(email, 'lawyer', lawyerName);
}

async function inviteClient(email: string, clientName?: string) {
  return inviteUser(email, 'client', clientName);
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

  // Ejemplo 2: Invitar a un cliente específico
  const result2 = await inviteClient('nuevo.cliente@ejemplo.com', 'María González');
  
  if (result2.success) {
    console.log('🎉 Cliente invitado correctamente');
  } else {
    console.log('💥 Falló la invitación:', result2.error);
  }

  // Ejemplo 3: Invitar a múltiples usuarios (mix)
  const usersToInvite = [
    { email: 'maria.gonzalez@legal.cl', name: 'María González', role: 'client' as const },
    { email: 'carlos.rodriguez@abogados.cl', name: 'Carlos Rodríguez', role: 'lawyer' as const },
    { email: 'ana.martinez@legal.cl', name: 'Ana Martínez', role: 'client' as const }
  ];

  console.log('\n📋 Invitando múltiples usuarios...');
  for (const user of usersToInvite) {
    const result = await inviteUser(user.email, user.role, user.name);
    console.log(`   ${user.email} (${user.role}): ${result.success ? '✅' : '❌'}`);
  }
}

// Exportar funciones para uso en otros módulos
export { inviteLawyer, inviteClient, inviteUser, generatePassword };
