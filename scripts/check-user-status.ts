import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5OTIxMCwiZXhwIjoyMDY4Mzc1MjEwfQ.8Q9QJQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserStatus(email: string) {
  try {
    // 1. Buscar el usuario en la tabla auth.users
    const { data: authData, error: authError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (authError) throw authError;
    
    console.log('\n🔐 Auth User Data:');
    console.log('ID:', authData.id);
    console.log('Email:', authData.email);
    console.log('Email Confirmado:', authData.email_confirmed_at || 'No');
    console.log('Confirmation Token:', authData.confirmation_token);
    console.log('Last Sign In:', authData.last_sign_in_at);
    console.log('Created At:', authData.created_at);
    
    // 2. Buscar en la tabla de perfiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.id)
      .single();
      
    if (profileError) throw profileError;
    
    console.log('\n👤 Profile Data:');
    console.log('Verified:', profileData.verified);
    console.log('Role:', profileData.role);
    console.log('Created At:', profileData.created_at);
    
    // 3. Verificar si el correo está verificado en auth.users
    if (!authData.email_confirmed_at) {
      console.log('\n⚠️ El correo no está verificado en auth.users');
      console.log('Para verificar manualmente, ejecuta el siguiente comando en la consola de SQL de Supabase:');
      console.log(`\nUPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '${authData.id}';\n`);
    } else {
      console.log('\n✅ El correo está verificado en auth.users');
    }
    
  } catch (error) {
    console.error('❌ Error al verificar el estado del usuario:', error);
  }
}

// Verificar el estado del usuario
checkUserStatus('gabignaciagomez@gmail.com');
