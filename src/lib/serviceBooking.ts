const CLIENT_SURCHARGE_PERCENT = 0.1;

export function applyClientSurcharge(priceClp: number): number {
  return Math.round(priceClp * (1 + CLIENT_SURCHARGE_PERCENT));
}

export function roundToThousands(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}

export function isInitialConsultationService(title: string): boolean {
  return title.toLowerCase().includes('consulta inicial');
}

/** Determina si el servicio requiere videollamada / cita agendada */
export function serviceRequiresMeeting(title: string): boolean {
  const normalized = title.toLowerCase();
  if (isInitialConsultationService(title)) return true;
  if (normalized.includes('consulta')) return true;
  if (normalized.includes('videollamada')) return true;
  if (normalized.includes('reunión') || normalized.includes('reunion')) return true;
  return false;
}
