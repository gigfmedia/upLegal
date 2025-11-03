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

interface MercadoPagoDebugInfo {
  env: string;
  publicKey: string;
  timestamp: string;
  initialized: boolean;
  version?: string;
  error?: string;
  environment?: 'production' | 'sandbox';
  sdkLoaded?: boolean;
  sdkVersion?: string;
}

declare global {
  interface Window {
    MercadoPago: {
      new (publicKey: string, options?: {
        locale?: string;
        advancedFraudPrevention?: boolean;
        environment?: 'production' | 'sandbox';
      }): MercadoPagoInstance;
      VERSION?: string;
    };
    __mp_debug?: MercadoPagoDebugInfo;
  }
}

export function initializeMercadoPago(): MercadoPagoInstance | null {
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  const isProduction = import.meta.env.VITE_MERCADOPAGO_ENV === 'production';
  
  // Initialize debug object with proper typing
  const debugInfo: MercadoPagoDebugInfo = {
    env: isProduction ? 'production' : 'sandbox',
    publicKey: publicKey ? `${publicKey.substring(0, 5)}...${publicKey.substring(publicKey.length - 3)}` : 'undefined',
    timestamp: new Date().toISOString(),
    initialized: false,
    version: '2.0.0', // Our integration version
    sdkVersion: window.MercadoPago?.VERSION || 'unknown',
    environment: isProduction ? 'production' : 'sandbox',
    sdkLoaded: false
  };

  // Attach to window immediately
  if (typeof window !== 'undefined') {
    window.__mp_debug = debugInfo;
    console.log('MercadoPago debug info attached to window.__mp_debug');
  }
  
  if (!publicKey) {
    const errorMsg = 'MercadoPago public key is not defined';
    console.error(errorMsg);
    if (window.__mp_debug) {
      window.__mp_debug.error = errorMsg;
    }
    return null;
  }

  // Validate public key format for production
  if (isProduction && publicKey.startsWith('TEST-')) {
    const errorMsg = 'Using sandbox public key in production mode!';
    console.error('ERROR:', errorMsg);
    if (window.__mp_debug) {
      window.__mp_debug.error = errorMsg;
    }
    return null;
  }

  try {
    console.log('Initializing MercadoPago with key:', publicKey.substring(0, 10) + '...');
    
    const mp = new window.MercadoPago(publicKey, {
      locale: 'es-CL',
      advancedFraudPrevention: true,
      environment: isProduction ? 'production' : 'sandbox' // Explicitly set environment
    });

    // Update debug info after successful initialization
    if (window.__mp_debug) {
      window.__mp_debug.initialized = true;
      window.__mp_debug.sdkLoaded = true;
      window.__mp_debug.sdkVersion = window.MercadoPago?.VERSION || 'unknown';
    }

    // Enhanced debug output
    console.group('MercadoPago Initialization');
    console.log('SDK Version:', window.MercadoPago?.VERSION || 'unknown');
    console.log('Environment:', isProduction ? 'PRODUCTION' : 'SANDBOX');
    console.log('Public Key:', publicKey.substring(0, 5) + '...' + publicKey.substring(publicKey.length - 3));
    console.log('Debug Info:', JSON.parse(JSON.stringify(window.__mp_debug))); // Clone to avoid live object reference
    console.groupEnd();
    
    return mp;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize MercadoPago:', errorMsg);
    if (window.__mp_debug) {
      window.__mp_debug.error = errorMsg;
    }
    return null;
  }
}

// Export debug info getter for external access
export function getMercadoPagoDebugInfo(): MercadoPagoDebugInfo | { error: string } {
  if (typeof window === 'undefined') {
    return { error: 'Window not available' };
  }
  
  if (!window.__mp_debug) {
    return { error: 'MercadoPago not initialized' };
  }
  
  // Return a clone to prevent external modifications
  return { ...window.__mp_debug };
}
