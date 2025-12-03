// server.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const PJUD_API_URL = process.env.PJUD_API_URL || 'https://api.pjud.cl/consulta-abogados';

// Middleware para parsear JSON
app.use(express.json());

// Middleware sencillo de CORS
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const normalizeRut = (rut = '') => rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();

// Función para validar el dígito verificador del RUT
const validateRutDV = (rut) => {
  const cleanRut = normalizeRut(rut);
  
  // Validar formato básico
  if (!/^\d{7,8}[0-9K]$/i.test(cleanRut)) {
    return false;
  }

  // Extraer dígito verificador y número
  const dv = cleanRut.slice(-1).toUpperCase();
  const number = cleanRut.slice(0, -1);

  // Calcular dígito verificador esperado
  let sum = 0;
  let multiplier = 2;
  
  for (let i = number.length - 1; i >= 0; i--) {
    sum += parseInt(number.charAt(i)) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const calculatedDV = (11 - (sum % 11)) % 11;
  const expectedDV = calculatedDV === 10 ? 'K' : calculatedDV.toString();
  
  return dv === expectedDV;
};

// Endpoint simple para validar RUT (solo formato, no verifica con PJUD)
app.post('/verify-rut', async (req, res) => {
  const { rut } = req.body || {};

  if (!rut) {
    return res.status(400).json({
      valid: false,
      message: 'Se requiere un RUT para la verificación.'
    });
  }

  try {
    const isValid = validateRutDV(rut);
    
    return res.json({
      valid: isValid,
      message: isValid ? 'RUT válido' : 'RUT inválido'
    });
  } catch (error) {
    console.error('Error al validar RUT:', error);
    return res.status(500).json({
      valid: false,
      message: 'Error al validar el RUT',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para delegar la verificación PJUD desde el front-end
app.post('/verify-lawyer', async (req, res) => {
  const { rut, fullName } = req.body || {};

  if (!rut || !fullName) {
    return res.status(400).json({
      verified: false,
      message: 'Se requieren rut y nombre completo para la verificación.'
    });
  }

  const apiKey = process.env.PJUD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      verified: false,
      message: 'PJUD_API_KEY no está configurado en el servidor.'
    });
  }

  try {
    const cleanRut = normalizeRut(rut);
    const dv = cleanRut.slice(-1);
    const body = {
      rut: cleanRut.slice(0, -1),
      dv,
      nombre: fullName
    };

    console.log('Enviando verificación PJUD desde el servidor...', body);

    const response = await fetch(PJUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const rawText = await response.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (parseError) {
      console.error('No se pudo parsear la respuesta del PJUD:', parseError, rawText);
    }

    if (!response.ok) {
      console.error('Error en respuesta del PJUD:', response.status, data);
      return res.status(response.status).json({
        verified: false,
        message: data?.message || 'Error en la verificación con el Poder Judicial',
        details: data || rawText
      });
    }

    const verified = data?.verificado === true;
    return res.json({
      verified,
      details: data
    });
  } catch (error) {
    console.error('Error al contactar al Poder Judicial:', error);
    return res.status(500).json({
      verified: false,
      message: 'No se pudo contactar al Poder Judicial',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Ruta de verificación de estado
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Payment service is running' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor de pagos escuchando en el puerto ${PORT}`);
});