// src/lib/mercadoPagoInit.ts
declare global {
  interface Window {
    MercadoPago: any;
  }
}

export function initializeMercadoPago() {
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  const isProduction = import.meta.env.VITE_MERCADOPAGO_ENV === 'production';
  
  if (!publicKey) {
    console.error('MercadoPago public key is not defined');
    return null;
  }

  const mp = new window.MercadoPago(publicKey, {
    locale: 'es-CL',
    advancedFraudPrevention: true
  });

  console.log(`MercadoPago SDK initialized in ${isProduction ? 'PRODUCTION' : 'SANDBOX'} mode`);
  return mp;
}

// Type declaration for the global MP variable
declare const MercadoPago: any;
