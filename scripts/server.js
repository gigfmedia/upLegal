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