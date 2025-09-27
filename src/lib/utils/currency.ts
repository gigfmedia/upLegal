/**
 * Format a number as currency
 * @param amount - The amount to format (in smallest currency unit, e.g., cents)
 * @param currency - The currency code (e.g., 'USD', 'CLP')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'CLP'): string {
  try {
    // For Chilean Peso (CLP), we format without decimals
    if (currency.toUpperCase() === 'CLP') {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    // For other currencies, use default formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    // Fallback to simple formatting
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Convert amount from cents to dollars (or other base unit)
 * @param amount - The amount in cents (or other smallest unit)
 * @param decimals - Number of decimal places (default: 2)
 * @returns The amount in dollars (or other base unit)
 */
export function fromCents(amount: number, decimals: number = 2): number {
  return parseFloat((amount / 100).toFixed(decimals));
}

/**
 * Convert amount to cents (or other smallest unit)
 * @param amount - The amount in dollars (or other base unit)
 * @returns The amount in cents (or other smallest unit)
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
