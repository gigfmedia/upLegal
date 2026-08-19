const UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const DIECISEIS_A_DIECINUEVE = ['dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function hasta99(n: number): string {
  if (n < 16) return ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince'][n]
  if (n < 20) return DIECISEIS_A_DIECINUEVE[n - 16]
  const decena = Math.floor(n / 10)
  const unidad = n % 10
  if (unidad === 0) return DECENAS[decena]
  if (decena === 2) return `veinti${['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'][unidad - 1]}`
  return `${DECENAS[decena]} y ${UNIDADES[unidad]}`
}

function hasta999(n: number): string {
  const centena = Math.floor(n / 100)
  const resto = n % 100
  if (centena === 0) return resto === 0 ? 'cero' : hasta99(resto)
  if (centena === 1 && resto === 0) return 'cien'
  const centenaPart = centena === 1 ? 'ciento' : CENTENAS[centena]
  if (resto === 0) return centenaPart
  return `${centenaPart} ${hasta99(resto)}`
}

export function numberToWords(n: number): string {
  if (n === 0) return 'cero'
  if (n < 0) return `menos ${numberToWords(-n)}`
  const millones = Math.floor(n / 1000000)
  const miles = Math.floor((n % 1000000) / 1000)
  const resto = n % 1000
  const parts: string[] = []

  if (millones > 0) {
    if (millones === 1) parts.push('un millón')
    else if (millones < 1000) parts.push(`${hasta999(millones)} millones`)
    else {
      const millonesMiles = Math.floor(millones / 1000)
      const millonesResto = millones % 1000
      if (millonesMiles === 1) parts.push(`mil ${millonesResto === 0 ? '' : `${hasta999(millonesResto)} `}millones`.trim())
      else parts.push(`${hasta999(millonesMiles)} mil ${millonesResto === 0 ? '' : `${hasta999(millonesResto)} `}millones`.trim())
    }
  }

  if (miles > 0) {
    if (miles === 1) parts.push('mil')
    else parts.push(`${hasta999(miles)} mil`)
  }

  if (resto > 0) parts.push(hasta999(resto))

  return parts.join(' ')
}

export function numberToCLPWords(amount: number): string {
  const n = Math.floor(amount)
  if (n === 0) return 'cero pesos'
  if (n === 1) return 'un peso'

  let words = numberToWords(n)

  words = words.replace(/\bveintiuno(?=\s|$)/g, 'veintiún')
  words = words.replace(/\buno(?=\s(?:mil|millón|millones|pesos)|$)/g, 'un')
  if (/mill[oó]n(es)?$/.test(words)) words += ' de'

  return `${words} pesos`
}

export function numberToCLPWordsCapitalized(amount: number): string {
  const words = numberToCLPWords(amount)
  return words.charAt(0).toUpperCase() + words.slice(1)
}