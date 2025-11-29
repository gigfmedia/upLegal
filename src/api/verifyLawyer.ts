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

interface VerificationResult {
  verified: boolean;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

export const verifyLawyer = async (rut: string, fullName: string): Promise<VerificationResult> => {
  console.log(`Iniciando verificación de abogado - RUT: ${rut}, Nombre: ${fullName}`);
  
  try {
    // First validate RUT format
    if (!validateRUT(rut)) {
      const errorMsg = 'Formato de RUT inválido. Use el formato 12.345.678-9';
      console.error(errorMsg);
      return {
        verified: false,
        message: errorMsg,
        error: errorMsg
      };
    }

    console.log('Realizando verificación con el Poder Judicial...');

    const backendUrl = import.meta.env.VITE_PAYMENT_SERVICE_URL || 'http://localhost:3001';
    const endpoint = `${backendUrl.replace(/\/$/, '')}/verify-lawyer`;

    let isVerified = false;
    let verificationDetails: Record<string, unknown> | undefined;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rut, fullName })
      });

      const payload = await response.json();
      verificationDetails = payload?.details;

      if (!response.ok) {
        throw new Error(payload?.message || 'Error en la verificación con el servidor');
      }

      isVerified = payload?.verified === true;
    } catch (serverError) {
      console.error('Error al usar el backend de verificación, usando fallback local:', serverError);
      // fallback to direct PJUD call (simulated) to avoid dejar usuario bloqueado
      isVerified = await simulatePJUDVerification(rut, fullName);
    }

    if (isVerified) {
      console.log('Verificación exitosa - Abogado encontrado en los registros');
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error al obtener el usuario:', userError);
        throw userError;
      }
      
      if (user) {
        // Update the user's verification status in the database
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            pjud_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Error al actualizar el perfil:', updateError);
          throw updateError;
        }
        
        console.log('Perfil actualizado con éxito');
      }
      
      return { 
        verified: true,
        message: 'Abogado verificado exitosamente en el Poder Judicial',
        details: verificationDetails
      };
    } else {
      const errorMsg = 'El RUT no está registrado como abogado en el Poder Judicial';
      console.log(errorMsg);
      return { 
        verified: false,
        message: errorMsg,
        error: errorMsg
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido al verificar con el Poder Judicial';
    console.error('Error en verifyLawyer:', error);
    return {
      verified: false,
      message: errorMsg,
      error: errorMsg
    };
  }
};

// Simulate PJUD verification (replace with actual API call)
const simulatePJUDVerification = async (rut: string, fullName: string): Promise<boolean> => {
  console.log(`Simulando verificación PJUD para RUT: ${rut}, Nombre: ${fullName}`);
  
  // Simulate API call delay (1-2 seconds)
  const delay = 1000 + Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // In a real implementation, you would make an actual API call here:
  
  try {
    console.log('Realizando petición al Poder Judicial...');
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
    
    if (!response.ok) {
      throw new Error(`Error en la respuesta del servidor: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Respuesta del Poder Judicial:', data);
    return data.verificado === true;
  } catch (error) {
    console.error('Error al contactar al Poder Judicial:', error);
    throw error;
  }
};
