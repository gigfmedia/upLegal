import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5OTIxMCwiZXhwIjoyMDY4Mzc1MjEwfQ.8Q9QJQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';

// Crear cliente de administración
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyUserEmail(email: string) {
  try {
    // 1. Buscar el usuario por email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers({
      filter: { email }
    });

    if (userError) throw userError;
    if (!users.users.length) {
      console.log('❌ No se encontró ningún usuario con ese correo');
      return;
    }

    const user = users.users[0];
    console.log('👤 Usuario encontrado:', user.id);
    console.log('📧 Email verificado actualmente:', user.email_confirmed_at ? 'Sí' : 'No');

    // 2. Verificar el correo electrónico
    if (!user.email_confirmed_at) {
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (updateError) throw updateError;
      console.log('✅ Correo verificado exitosamente');
      console.log('Nuevo estado de verificación:', updatedUser.user.email_confirmed_at ? 'Verificado' : 'No verificado');
    } else {
      console.log('ℹ️ El correo ya estaba verificado');
    }

  } catch (error) {
    console.error('❌ Error al verificar el correo:', error);
  }
}

// Ejecutar la función con el correo a verificar
verifyUserEmail('gabignaciagomez@gmail.com');
