export const PRICING = {
  PAGARE: 9990,
  LAWYER_REVIEW: 24990,
} as const

export type PriceKey = keyof typeof PRICING

export function getPrice(priceKey: string): number {
  return (PRICING as Record<string, number>)[priceKey] || 0
}

export function formatPrice(price: number): string {
  return price.toLocaleString('es-CL')
}