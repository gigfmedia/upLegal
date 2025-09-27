import { NextApiRequest, NextApiResponse } from 'next';
import { handleMercadoPagoWebhook } from '@/services/mercadopagoService';

export const config = {
  api: {
    bodyParser: false,
  },
};

type ReadableStream = NodeJS.ReadableStream;

async function buffer(readable: ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const buf = await buffer(req);
    const rawBody = buf.toString('utf8');
    
    // Verify the signature (you'll need to implement this based on your security requirements)
    // const signature = req.headers['x-signature'] as string;
    // if (!verifySignature(signature, rawBody)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Parse the JSON body
    const data = JSON.parse(rawBody);
    
    // Handle the webhook
    const result = await handleMercadoPagoWebhook(data);
    
    // Return a 200 response to acknowledge receipt of the webhook
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      error: 'Error processing webhook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
