import { supabase } from '@/lib/supabaseClient';

// Validate RUT format (Chilean ID)
const validateRUT = (rut: string): boolean => {
  // Remove dots and dash
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  
  // Check format
  if (!/^\d{7,8}[0-9K]$/.test(cleanRut)) {
    return false;
  }
  
  // Validate check digit
  const rutDigits = cleanRut.slice(0, -1);
  const checkDigit = cleanRut.slice(-1);
  
  let sum = 0;
  let multiplier = 2;
  
  // Calculate check digit
  for (let i = rutDigits.length - 1; i >= 0; i--) {
    sum += parseInt(rutDigits.charAt(i)) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const calculatedCheckDigit = 11 - (sum % 11);
  let expectedCheckDigit = calculatedCheckDigit === 11 ? '0' : 
                         calculatedCheckDigit === 10 ? 'K' : 
                         calculatedCheckDigit.toString();
  
  return expectedCheckDigit === checkDigit;
};

export const verifyLawyer = async (rut: string, fullName: string) => {
  try {
    // First validate RUT format
    if (!validateRUT(rut)) {
      throw new Error('Formato de RUT inválido');
    }

    // In a real implementation, you would call the PJUD API here
    // For now, we'll simulate a successful verification
    const isVerified = await simulatePJUDVerification(rut, fullName);

    if (isVerified) {
      // Update the user's verification status in the database
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ pjud_verified: true })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      return { verified: true };
    } else {
      return { 
        verified: false,
        message: 'No se pudo verificar el abogado en los registros del Poder Judicial'
      };
    }
  } catch (error) {
    console.error('Error verifying lawyer:', error);
    throw new Error('Error al verificar con el Poder Judicial');
  }
};

// Simulate PJUD verification (replace with actual API call)
const simulatePJUDVerification = async (rut: string, fullName: string): Promise<boolean> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real implementation, you would make an actual API call here:
  /*
  const response = await fetch('https://api.pjud.cl/consulta-abogados', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_PJUD_API_KEY}`
    },
    body: JSON.stringify({
      rut: rut.replace(/\./g, '').replace(/-/g, '').slice(0, -1),
      dv: rut.slice(-1).toUpperCase(),
      nombre: fullName
    })
  });
  
  const data = await response.json();
  return data.verificado === true;
  */
  
  // For now, simulate 80% success rate
  return Math.random() < 0.8;
};
