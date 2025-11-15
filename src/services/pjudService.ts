import { supabase } from '@/lib/supabaseClient';

/**
 * Verifies a RUT with the Poder Judicial (PJUD) API
 * @param rut The RUT to verify (formatted as XX.XXX.XXX-X)
 * @returns Promise with verification result
 */
export const verifyRutWithPJUD = async (rut: string): Promise<{ valid: boolean; message?: string }> => {
  try {
    if (!rut) {
      return { valid: false, message: 'El RUT es requerido' };
    }

    // Clean and format RUT
    const cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleanRut.length < 2) {
      return { valid: false, message: 'RUT inválido' };
    }

    try {
      // Call Supabase Edge Function to verify RUT
      const { data, error } = await supabase.functions.invoke('verify-rut', {
        body: { rut: cleanRut }
      });

      if (error) {
        console.error('Error al verificar RUT:', error);
        return { 
          valid: false, 
          message: 'Error al conectar con el servicio de verificación. Por favor, intente nuevamente.' 
        };
      }

      return {
        valid: data?.valid || false,
        message: data?.message || (data?.valid ? 'RUT verificado exitosamente' : 'No se pudo verificar el RUT')
      };
    } catch (error) {
      console.error('Error en la función de verificación:', error);
      return { 
        valid: false, 
        message: 'Error al procesar la verificación del RUT' 
      };
    }
  } catch (error) {
    console.error('Error inesperado en verifyRutWithPJUD:', error);
    return { 
      valid: false, 
      message: 'Error inesperado al verificar el RUT' 
    };
  }
};

/**
 * Cleans and formats a RUT string (removes dots and dash, keeps only numbers and K)
 * @param rut The RUT to clean
 * @returns Cleaned RUT string (12345678-9)
 */
export const cleanRut = (rut: string): string => {
  return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
};

/**
 * Formats a RUT string with dots and dash (XX.XXX.XXX-X)
 * @param rut The RUT to format (can be with or without formatting)
 * @returns Formatted RUT string
 */
export const formatRut = (rut: string): string => {
  // Clean the RUT first
  let clean = cleanRut(rut);
  if (!clean) return '';

  // Extract verifier digit (last character)
  const verifier = clean.slice(-1);
  // Get the number part
  const numberPart = clean.slice(0, -1);

  // Format the number part with dots
  let formatted = '';
  for (let i = numberPart.length - 1, j = 1; i >= 0; i--, j++) {
    formatted = numberPart[i] + formatted;
    if (j % 3 === 0 && i > 0) {
      formatted = '.' + formatted;
    }
  }

  // Add the verifier digit with a dash
  return `${formatted}-${verifier}`;
};

/**
 * Validates a RUT using the verification digit algorithm
 * @param rut The RUT to validate (with or without formatting)
 * @returns boolean indicating if the RUT is valid
 */
export const validateRut = (rut: string): boolean => {
  // Clean the RUT
  const clean = cleanRut(rut);
  
  // Basic format validation
  if (!/^\d{7,8}[0-9K]$/i.test(clean)) {
    return false;
  }

  // Extract verifier digit and number part
  const verifier = clean.slice(-1).toUpperCase();
  const numberPart = clean.slice(0, -1);

  // Calculate the expected verifier digit
  let sum = 0;
  let multiplier = 2;
  
  for (let i = numberPart.length - 1; i >= 0; i--) {
    sum += parseInt(numberPart.charAt(i)) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const calculatedVerifier = (11 - (sum % 11)) % 11;
  const expectedVerifier = calculatedVerifier === 10 ? 'K' : calculatedVerifier.toString();
  
  return verifier === expectedVerifier;
};
