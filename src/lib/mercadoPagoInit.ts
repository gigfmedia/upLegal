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

  // Validate public key format for production
  if (isProduction && publicKey.startsWith('TEST-')) {
    console.error('ERROR: Using sandbox public key in production mode!');
    return null;
  }

  try {
    console.log('Initializing MercadoPago with key:', publicKey.substring(0, 10) + '...');
    
    const mp = new window.MercadoPago(publicKey, {
      locale: 'es-CL',
      advancedFraudPrevention: true,
      // Force production mode if VITE_MERCADOPAGO_ENV is set to production
      ...(isProduction && { environment: 'production' })
    });

    console.log(`MercadoPago SDK initialized in ${isProduction ? 'PRODUCTION' : 'SANDBOX'} mode`);
    
    // Add to window for debugging
    if (isProduction) {
      (window as any).__mp = {
        env: 'production',
        publicKey: publicKey.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      };
    }
    
    return mp;
  } catch (error) {
    console.error('Failed to initialize MercadoPago:', error);
    return null;
  }
}
