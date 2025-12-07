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

    // Use backend server (more reliable than Edge Functions for external requests)
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const endpoint = `${backendUrl.replace(/\/$/, '')}/verify-lawyer`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rut, fullName })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const payload = await response.json();

    if (payload.verified) {

      // Update current user's profile to reflect verification
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('No se pudo obtener el usuario para actualizar verificación:', authError);
        } else if (user?.id) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              pjud_verified: true,
              verified: true,
              rut: rut.replace(/\./g, '').toUpperCase(),
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('Error al actualizar pjud_verified en el perfil:', updateError);
          }
        }
      } catch (profileError) {
        console.error('Fallo al actualizar el perfil tras verificación PJUD:', profileError);
      }
      
      return { 
        verified: true,
        message: payload.message || 'Abogado verificado exitosamente en el Poder Judicial',
        details: payload.details
      };
    } else {
      const errorMsg = payload.message || 'El RUT no está registrado como abogado en el Poder Judicial';

      // Explicitly flag the profile as not verified to keep state consistent
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!authError && user?.id) {
          await supabase
            .from('profiles')
            .update({
              pjud_verified: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
      } catch (profileError) {
        console.error('Fallo al limpiar estado de verificación PJUD:', profileError);
      }
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
      message: 'No se pudo conectar con el servicio de verificación. Asegúrate de que el servidor backend esté corriendo.',
      error: errorMsg
    };
  }
};

