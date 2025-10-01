import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

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
    
    // Call the PJUD API (this is a placeholder - you'll need to implement the actual API call)
    // For now, we'll simulate a successful verification
    const isVerified = await verifyWithPJUD(rutDigits, checkDigit, fullName);

    if (isVerified) {
      return res.status(200).json({ verified: true });
    } else {
      return res.status(200).json({ 
        verified: false,
        message: 'No se pudo verificar el abogado en los registros del Poder Judicial'
      });
    }
  } catch (error) {
    console.error('Error verifying lawyer:', error);
    return res.status(500).json({ 
      message: 'Error al verificar con el Poder Judicial',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// This is a placeholder function - you'll need to implement the actual PJUD API integration
async function verifyWithPJUD(rutDigits: string, checkDigit: string, fullName: string): Promise<boolean> {
  try {
    // TODO: Implement actual PJUD API integration
    // This is a mock implementation that simulates verification
    
    // For now, we'll simulate a successful verification 80% of the time
    // In a real implementation, you would make an HTTP request to the PJUD API
    // and parse the response to determine if the lawyer is verified
    
    // Example of how you might structure the actual API call:
    /*
    const response = await fetch('https://api.pjud.cl/consulta-abogados', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PJUD_API_KEY}`
      },
      body: JSON.stringify({
        rut: rutDigits,
        dv: checkDigit,
        nombre: fullName
      })
    });
    
    const data = await response.json();
    return data.verificado === true;
    */
    
    // For now, we'll simulate a response
    return Math.random() < 0.8; // 80% chance of verification success
  } catch (error) {
    console.error('Error in PJUD verification:', error);
    return false;
  }
}
