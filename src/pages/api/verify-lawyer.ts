import { NextApiRequest, NextApiResponse } from 'next';
import { scrapePoderJudicial } from '@/lib/pjudScraper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { rut, fullName } = req.body;

    if (!rut || !fullName) {
      return res.status(400).json({ message: 'RUT and full name are required' });
    }

    // Clean and format RUT
    const cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    const rutDigits = cleanRut.slice(0, -1);
    const checkDigit = cleanRut.slice(-1);
    
    // Call the PJUD verification
    const { verified, message } = await verifyWithPJUD(rutDigits, checkDigit, fullName);
    
    return res.status(200).json({ 
      verified,
      message: message || (verified 
        ? 'Abogado verificado exitosamente' 
        : 'No se pudo verificar el abogado en los registros del Poder Judicial')
    });
  } catch (error) {
    console.error('Error verifying lawyer:', error);
    return res.status(500).json({ 
      message: 'Error al verificar con el Poder Judicial',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Verify RUT with Poder Judicial
async function verifyWithPJUD(rutDigits: string, checkDigit: string, fullName: string): Promise<{ verified: boolean; message?: string }> {
  try {
    const rut = `${rutDigits}${checkDigit}`;
    console.log(`Verifying RUT: ${rut} for ${fullName}`);
    
    const result = await scrapePoderJudicial(rut, fullName);
    console.log('PJUD Verification Result:', JSON.stringify(result, null, 2));
    
    return {
      verified: result.verified,
      message: result.message
    };
  } catch (error) {
    console.error('Error in PJUD verification:', error);
    return {
      verified: false,
      message: 'Error al conectar con el servicio de verificación'
    };
  }
}
