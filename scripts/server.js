// server.js
import express from 'express';

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Ruta de verificación de estado
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Payment service is running' });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor de pagos escuchando en el puerto ${PORT}`);
});