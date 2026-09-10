/** Canonical CLP contract shared by booking UI and server. */
export function consultationBase(hourlyRate, duration) {
  return Math.round(Number(hourlyRate) * Number(duration) / 60);
}

export function bookingClientTotal(base, surcharge) {
  return Math.round(Number(base) * (1 + Number(surcharge)) / 1000) * 1000;
}

export function bookingPricingSnapshot(base, surcharge, platformFee) {
  const clientTotal = bookingClientTotal(base, surcharge);
  const fee = Math.round(base * platformFee);
  return {
    base_amount: base,
    client_total: clientTotal,
    client_surcharge: clientTotal - base,
    client_surcharge_percent: surcharge,
    platform_fee: fee,
    platform_fee_percent: platformFee,
    lawyer_amount: Math.max(base - fee, 0),
    currency: 'CLP',
  };
}
