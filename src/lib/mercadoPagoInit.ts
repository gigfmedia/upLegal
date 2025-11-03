// src/lib/mercadoPagoInit.ts
interface CheckoutOptions {
  autoOpen?: boolean;
  theme?: {
    elementsVariant?: 'default' | 'bootstrap' | 'flat' | 'bulma' | 'material';
  };
  render?: {
    container: string;
    label: string;
    type?: 'wallet_purchase' | 'subscription' | 'recurring_payment';
  };
}

interface MercadoPagoInstance {
  checkout: (options: CheckoutOptions) => {
    open: () => void;
    update: (updateOptions: { amount: number }) => void;
  };
  // Add other methods as needed
}

declare global {
  interface Window {
    MercadoPago: {
      new (publicKey: string, options?: {
        locale?: string;
        advancedFraudPrevention?: boolean;
      }): MercadoPagoInstance;
    };
  }
}

export function initializeMercadoPago(): MercadoPagoInstance | null {
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  const isProduction = import.meta.env.VITE_MERCADOPAGO_ENV === 'production';
  
  if (!publicKey) {
    console.error('MercadoPago public key is not defined');
    return null;
  }

  try {
    const mp = new window.MercadoPago(publicKey, {
      locale: 'es-CL',
      advancedFraudPrevention: true
    });

    console.log(`MercadoPago SDK initialized in ${isProduction ? 'PRODUCTION' : 'SANDBOX'} mode`);
    return mp;
  } catch (error) {
    console.error('Failed to initialize MercadoPago:', error);
    return null;
  }
}
