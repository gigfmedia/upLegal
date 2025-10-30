import { apiRequest } from '@/lib/api';

/**
 * Verifies a RUT with the Poder Judicial (PJUD) API
 * @param rut The RUT to verify (formatted as XX.XXX.XXX-X)
 * @returns Promise with verification result
 */
export const verifyRutWithPJUD = async (rut: string) => {
  try {
    // The actual endpoint will be your Supabase Function that handles the PJUD API call
    const response = await apiRequest<{
      verified: boolean;
      data?: {
        nombre?: string;
        rut?: string;
        estado?: string;
        // Add other fields you expect from the PJUD API
      };
      error?: string;
    }>('verify-rut', {
      method: 'POST',
      body: { rut },
      autoRefresh: true,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return {
      verified: response.verified,
      data: response.data,
    };
  } catch (error) {
    console.error('Error verifying RUT with PJUD:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Error al verificar el RUT con el Poder Judicial'
    );
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
