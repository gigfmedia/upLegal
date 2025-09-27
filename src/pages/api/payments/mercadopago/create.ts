import { NextApiRequest, NextApiResponse } from 'next';
import { createMercadoPagoPayment } from '@/services/mercadopagoService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const {
      amount,
      lawyerId,
      serviceId,
      description,
      successUrl,
      failureUrl,
      pendingUrl,
    } = req.body;

    if (!amount || !lawyerId || !description || !successUrl || !failureUrl || !pendingUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const notificationUrl = `${baseUrl}/api/payments/mercadopago/webhook`;

    const { paymentId, initPoint, preferenceId } = await createMercadoPagoPayment({
      amount: Number(amount),
      userId: session.user.id,
      lawyerId,
      serviceId,
      description,
      successUrl,
      failureUrl,
      pendingUrl,
      notificationUrl,
      userEmail: session.user.email || '',
      userName: session.user.name,
    });

    return res.status(200).json({
      paymentId,
      initPoint,
      preferenceId,
    });
  } catch (error) {
    console.error('Error creating MercadoPago payment:', error);
    return res.status(500).json({
      error: 'Failed to create payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
