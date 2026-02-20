/**
 * Genera un enlace de Google Meet para una reunión
 * @param title Título de la reunión (opcional)
 * @param date Fecha y hora de la reunión (opcional)
 * @param duration Duración en minutos (opcional)
 * @returns URL de la reunión de Google Meet
 */
export function generateGoogleMeetLink(
  title: string = 'Reunión Legal',
  date?: Date,
  duration: number = 60
): string {
  // Base URL de Google Meet
  let meetUrl = 'https://meet.google.com/new';
  
  // Si se proporciona una fecha, formatearla para el calendario
  if (date) {
    const startTime = date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const endTime = new Date(date.getTime() + duration * 60 * 1000)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d+Z$/, 'Z');
    
    // Crear enlace con parámetros de calendario
    meetUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${startTime}/${endTime}` +
      `&details=${encodeURIComponent('Reunión programada a través de LegalUp')}` +
      `&add=google.com`;
  }
  
  return meetUrl;
}

/**
 * Formatea un enlace de Google Meet para mostrarlo de manera más amigable
 * @param url URL de Google Meet
 * @returns URL formateada
 */
export function formatMeetLink(url: string): string {
  // Extraer solo la parte del enlace después de meet.google.com/
  const match = url.match(/meet\.google\.com\/([a-z]+-[a-z]+-[a-z]+)/i);
  if (match && match[1]) {
    return `meet.google.com/${match[1]}`;
  }
  return url;
}

/**
 * Verifica si una URL es un enlace de Google Meet válido
 * @param url URL a verificar
 * @returns boolean
 */
export function isValidMeetUrl(url: string): boolean {
  return /^https?:\/\/meet\.google\.com\/[a-z]+-[a-z]+-[a-z]+/i.test(url);
}
