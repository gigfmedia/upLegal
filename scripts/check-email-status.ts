import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5OTIxMCwiZXhwIjoyMDY4Mzc1MjEwfQ.8Q9QJQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmailStatus(email: string) {
  try {
    // Buscar el usuario por email en la tabla auth.users
    const { data: authData, error: authError } = await supabase
      .from('users')
      .select('id, email_confirmed_at, email')
      .eq('email', email)
      .single();

    if (authError) {
      console.error('❌ Error al buscar el usuario:', authError);
      return;
    }

    if (!authData) {
      console.log('❌ No se encontró ningún usuario con ese correo');
      return;
    }

    console.log('👤 Usuario encontrado en auth.users:');
    console.log('ID:', authData.id);
    console.log('Email:', authData.email);
    console.log('Email verificado:', authData.email_confirmed_at ? 'Sí' : 'No');
    console.log('Fecha de verificación:', authData.email_confirmed_at || 'No verificado');

    // Buscar en la tabla de perfiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.id)
      .single();

    if (profileError) {
      console.error('❌ Error al buscar el perfil:', profileError);
      return;
    }

    if (profileData) {
      console.log('\n📋 Perfil encontrado:');
      console.log('Nombre completo:', profileData.display_name || 'No especificado');
      console.log('Rol:', profileData.role || 'No especificado');
      console.log('Verificado:', profileData.verified ? 'Sí' : 'No');
    } else {
      console.log('\nℹ️ No se encontró un perfil para este usuario');
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Verificar el estado del correo electrónico
checkEmailStatus('gabignaciagomez@gmail.com');
