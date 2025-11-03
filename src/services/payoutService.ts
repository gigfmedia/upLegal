import { supabase } from '../lib/supabaseClient';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import cron from 'node-cron';

// Inicializar cliente de Mercado Pago
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
    idempotencyKey: 'upegal-payouts',
  },
});

const paymentClient = new Payment(mercadopago);

interface PendingPayout {
  lawyer_id: string;
  total_amount: number;
  email: string;
  full_name: string;
  payment_ids: string[];
}

/**
 * Obtiene los pagos pendientes de pago a abogados
 */
async function getPendingPayouts(): Promise<PendingPayout[]> {
  // Obtener pagos de la semana anterior que aún no se han pagado
  const lastMonday = new Date();
  lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7)); // Último lunes
  lastMonday.setHours(0, 0, 0, 0);

  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, lawyer_id, lawyer_amount, status, user:profiles(email, full_name)')
    .eq('status', 'succeeded')
    .eq('payout_status', 'pending')
    .lt('created_at', lastMonday.toISOString());

  if (error) {
    console.error('Error al obtener pagos pendientes:', error);
    return [];
  }

  // Agrupar por abogado
  const payouts = new Map<string, PendingPayout>();
  
  payments?.forEach(payment => {
    if (!payouts.has(payment.lawyer_id)) {
      payouts.set(payment.lawyer_id, {
        lawyer_id: payment.lawyer_id,
        total_amount: 0,
        email: payment.user.email,
        full_name: payment.user.full_name || 'Abogado',
        payment_ids: []
      });
    }
    
    const payout = payouts.get(payment.lawyer_id)!;
    payout.total_amount += payment.lawyer_amount;
    payout.payment_ids.push(payment.id);
  });

  return Array.from(payouts.values());
}

/**
 * Realiza la transferencia a un abogado
 */
async function processPayout(payout: PendingPayout): Promise<boolean> {
  try {
    // Obtener el token de acceso del abogado (si lo tiene configurado)
    const { data: lawyer } = await supabase
      .from('profiles')
      .select('mp_access_token')
      .eq('id', payout.lawyer_id)
      .single();

    if (!lawyer?.mp_access_token) {
      console.error(`Abogado ${payout.lawyer_id} no tiene token de acceso configurado`);
      return false;
    }

    // Crear transferencia con el token del abogado
    const transfer = await mercadopago.transfer.create({
      amount: payout.total_amount,
      currency_id: 'CLP', // O la moneda correspondiente
      user_id: payout.lawyer_id,
      external_reference: `PAYOUT-${new Date().toISOString().split('T')[0]}`,
      metadata: {
        description: `Pago de servicios - ${payout.full_name}`,
        payment_ids: payout.payment_ids.join(',')
      }
    });

    // Actualizar estado de los pagos
    const { error } = await supabase
      .from('payments')
      .update({ 
        payout_status: 'completed',
        payout_date: new Date().toISOString(),
        payout_reference: transfer.id
      })
      .in('id', payout.payment_ids);

    if (error) {
      console.error('Error al actualizar estado de pagos:', error);
      return false;
    }

    console.log(`Transferencia exitosa a ${payout.full_name} por $${payout.total_amount}`);
    return true;
  } catch (error) {
    console.error(`Error en transferencia a abogado ${payout.lawyer_id}:`, error);
    return false;
  }
}

/**
 * Programa la tarea de pagos semanales
 */
export function scheduleWeeklyPayouts() {
  // Ejecutar todos los lunes a las 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    try {
      console.log('Iniciando proceso de pagos semanales...');
      const payouts = await getPendingPayouts();
      
      if (payouts.length === 0) {
        console.log('No hay pagos pendientes para procesar');
        return;
      }

      console.log(`Procesando ${payouts.length} pagos pendientes...`);
      
      for (const payout of payouts) {
        await processPayout(payout);
      }

      console.log('Proceso de pagos semanales completado');
    } catch (error) {
      console.error('Error en el proceso de pagos semanales:', error);
    }
  }, {
    timezone: 'America/Santiago'
  });

  console.log('Programación de pagos semanales iniciada (lunes 9:00 AM)');
}

// Iniciar la programación al importar el módulo
if (process.env.NODE_ENV !== 'test') {
  scheduleWeeklyPayouts();
}
