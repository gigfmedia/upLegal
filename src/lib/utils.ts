import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a price in cents to a localized currency string
 * @param amount - The amount in cents
 * @param currency - The currency code (default: 'CLP')
 * @returns Formatted price string (e.g., "$10.000" for CLP)
 */
export function formatPrice(amount: number, currency: string = 'CLP'): string {
  if (currency === 'CLP') {
    // For CLP, we want to format as $10.000 (no decimals, dot as thousand separator)
    return `$${Math.round(amount).toLocaleString('es-CL')}`;
  }
  
  // For other currencies, use standard currency formatting
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}
