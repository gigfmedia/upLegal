import { supabase } from '@/lib/supabaseClient';

/**
 * Verifies a RUT with the Poder Judicial (PJUD) API
 * @param rut The RUT to verify (formatted as XX.XXX.XXX-X)
 * @param fullName The full name of the lawyer to verify
 * @returns Promise with verification result
 */
export const verifyRutWithPJUD = async (rut: string, fullName?: string): Promise<{ valid: boolean; message?: string }> => {
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
      // If no full name provided, only validate format
      if (!fullName || !fullName.trim()) {
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
          message: data?.message || (data?.valid ? 'RUT válido' : 'RUT inválido')
        };
      }

      // If full name is provided, verify with PJUD
      const RENDER_SERVER_URL = 'https://uplegal-service.onrender.com';
      
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
        
        const response = await fetch(`${RENDER_SERVER_URL}/verify-lawyer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            rut: cleanRut,
            fullName: fullName.trim()
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Error desconocido');
          throw new Error('Error en la respuesta del servidor');
        }

        const data = await response.json();
        
        // Only consider it valid if explicitly verified by the server
        const isValid = data.verified === true;
        
        return {
          valid: isValid,
          message: data?.message || (isValid 
            ? 'El RUT ha sido verificado como abogado en el sistema.' 
            : 'El RUT no está registrado como abogado en el Poder Judicial. Verifica que el RUT y nombre coincidan con tu registro oficial.')
        };
        
      } catch (error) {
        // Handle timeout and network errors
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.message.includes('Timeout')) {
            return { 
              valid: false, 
              message: 'La verificación tardó demasiado. Por favor, inténtalo de nuevo.'
            };
          }
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return { 
              valid: false, 
              message: 'Error de conexión. Por favor, verifica tu internet e inténtalo de nuevo.'
            };
          }
        }
        return { 
          valid: false, 
          message: 'Error al conectar con el servicio de verificación. Por favor, intente nuevamente.'
        };
      }
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
