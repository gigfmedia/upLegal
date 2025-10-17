// Cargar variables de entorno directamente (sin dotenv)
import { readFileSync } from 'fs';
import { Resend } from 'resend';

// 1. Leer manualmente el archivo .env.local
try {
  const envFile = readFileSync('.env.local', 'utf8');
  // Parsear las variables de entorno
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
  console.log('✅ Variables de entorno cargadas correctamente');
} catch (error) {
  console.error('⚠️ No se pudo cargar .env.local, usando variables de entorno del sistema');
}

// 2. Verificar que tenemos la API key
const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

if (!apiKey) {
  console.error('❌ Error: No se encontró RESEND_API_KEY en las variables de entorno');
  console.log('Asegúrate de que tu archivo .env.local contenga:');
  console.log('RESEND_API_KEY=tu_api_key_aquí');
  process.exit(1);
}

console.log('🔑 API Key encontrada');

// 3. Configurar Resend
const resend = new Resend(apiKey);

// 4. Función para enviar el correo
async function testEmail() {
  try {
    console.log('✉️  Enviando correo de prueba a gigfmedia@icloud.com...');
    
    const data = await resend.emails.send({
      from: 'UpLegal <hola@up-legal.cl>',
      to: 'gigfmedia@icloud.com',
      subject: 'Prueba de correo desde UpLegal',
      html: `
        <h1>¡Hola desde UpLegal!</h1>
        <p>Este es un correo de prueba enviado el ${new Date().toLocaleString()}</p>
      `,
    });

    console.log('✅ ¡Correo enviado con éxito!');
    console.log('📨 ID del mensaje:', data.id);
  } catch (error: any) {
    console.error('❌ Error al enviar el correo:');
    console.error('Mensaje:', error.message);
    
    if (error.response) {
      console.error('Detalles del error:', JSON.stringify(error.response, null, 2));
    }
  }
}

// Ejecutar la prueba
testEmail();
