// server.js
import 'dotenv/config';
import Stripe from 'stripe';
import express from 'express';

// Configura Stripe con tu clave secreta
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '');
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Este es tu secreto de webhook de Stripe CLI para pruebas locales
const endpointSecret = process.env.VITE_STRIPE_WEBHOOK_SECRET || '';

// Endpoint para crear un pago
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', payment_method, description, shipping } = req.body;

    // Validar los datos de entrada
    if (!amount || !payment_method) {
      return res.status(400).json({ error: 'Amount and payment method are required' });
    }

    // Crear el PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount, 10), // Asegurarse de que sea un número
      currency,
      payment_method,
      confirm: true,
      description: description || 'Pago desde upLegal',
      shipping,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Enviar la respuesta al cliente
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      id: paymentIntent.id
    });
  } catch (error) {
    console.error('Error al crear el pago:', error);
    res.status(500).json({
      error: 'Error al procesar el pago',
      message: error.message
    });
  }
});

// Middleware para parsear el body como raw para Stripe
app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Evento recibido: ${event.type}`);

  // Manejar el evento
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log('Pago exitoso:', paymentIntent.id, 'Monto:', paymentIntent.amount);
      
      // Aquí puedes agregar lógica para actualizar tu base de datos
      // Por ejemplo, usando Supabase para actualizar el estado del pago
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('Faltan variables de entorno de Supabase');
          break;
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // 1. Buscar el pago por session_id (que es lo que probablemente guardaste)
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .update({ 
            status: 'succeeded',
            stripe_session_id: paymentIntent.id,  // Asumiendo que guardaste el payment_intent.id como session_id
            updated_at: new Date().toISOString()
          })
          .eq('stripe_session_id', paymentIntent.id)  // Buscar por session_id
          .select()
          .single();
          
        if (paymentError) throw paymentError;
        
        // 2. Crear notificación para el cliente y el abogado
        if (paymentData) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: paymentData.client_user_id,  // Notificación para el cliente
              type: 'payment_success',
              title: '¡Pago exitoso!',
              message: `Tu pago de $${paymentIntent.amount / 100} ha sido procesado correctamente.`,
              metadata: {
                payment_id: paymentData.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
              },
              read: false
            },
            {
              user_id: paymentData.lawyer_user_id,  // Notificación para el abogado
              type: 'payment_received',
              title: '¡Nuevo pago recibido!',
              message: `Has recibido un pago de $${paymentData.lawyer_amount / 100} por tus servicios.`,
              metadata: {
                payment_id: paymentData.id,
                amount: paymentData.lawyer_amount,
                currency: paymentData.currency
              },
              read: false
            });
            
          if (notifError) throw notifError;
        }
        
        console.log('Dashboard y notificaciones actualizados para el pago:', paymentIntent.id);
      } catch (error) {
        console.error('Error al actualizar el dashboard:', error);
        // Aquí podrías implementar un sistema de reintentos o notificaciones de error
      }
      break;
    }
      
    case 'payment_intent.payment_failed': {
      const paymentFailed = event.data.object;
      console.log('Pago fallido:', paymentFailed.id);
      
      // Lógica similar para manejar pagos fallidos
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Actualizar estado del pago a fallido
          await supabase
            .from('payments')
            .update({ 
              status: 'failed',
              stripe_session_id: paymentFailed.id,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_session_id', paymentFailed.id);
        }
      } catch (error) {
        console.error('Error al actualizar pago fallido:', error);
      }
      break;
    }
      
    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  // Retorna 200 para confirmar la recepción del evento
  response.json({received: true});
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Servidor de webhooks ejecutándose en el puerto ${PORT}`);
  console.log('Asegúrate de que tu túnel de Stripe CLI esté configurado correctamente');
});