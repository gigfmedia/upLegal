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
  sdkAvailable?: boolean;
  sdkObject?: any;
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

// Helper to safely get SDK version
function getSDKVersion(): string {
  try {
    // Try different ways to get the SDK version
    if (typeof window.MercadoPago?.VERSION === 'string') {
      return window.MercadoPago.VERSION;
    }
    if (typeof window.MercadoPago?.version === 'string') {
      return window.MercadoPago.version;
    }
    return 'unknown';
  } catch (e) {
    return 'error';
  }
}

export function initializeMercadoPago(): MercadoPagoInstance | null {
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  const isProduction = import.meta.env.VITE_MERCADOPAGO_ENV === 'production';
  
  // Check if MercadoPago is available
  const sdkAvailable = typeof window !== 'undefined' && !!window.MercadoPago;
  const sdkVersion = sdkAvailable ? getSDKVersion() : 'not-loaded';
  
  // Initialize debug object with proper typing
  const debugInfo: MercadoPagoDebugInfo = {
    env: isProduction ? 'production' : 'sandbox',
    publicKey: publicKey ? `${publicKey.substring(0, 5)}...${publicKey.substring(publicKey.length - 3)}` : 'undefined',
    timestamp: new Date().toISOString(),
    initialized: false,
    version: '2.0.1', // Our integration version
    sdkVersion,
    environment: isProduction ? 'production' : 'sandbox',
    sdkLoaded: sdkAvailable,
    sdkAvailable,
    sdkObject: sdkAvailable ? { ...window.MercadoPago } : undefined
  };

  
  if (!publicKey) {
    console.error('MercadoPago public key is not defined');
    return null;
  }

  // Always enforce production mode
  console.log('Initializing MercadoPago in PRODUCTION mode with key:', publicKey.substring(0, 10) + '...');
  
  try {
    const mp = new window.MercadoPago(publicKey, {
      locale: 'es-CL',
      advancedFraudPrevention: true,
      environment: 'production' // Force production environment
    });

    console.log('MercadoPago SDK initialized in PRODUCTION mode');
    
    // Add to window for debugging
    (window as any).__mp = {
      env: 'production',
      publicKey: publicKey.substring(0, 10) + '...',
      timestamp: new Date().toISOString(),
      version: window.MercadoPago?.VERSION || 'unknown'
    };
    // Create a safe debug info object without circular references
    const safeDebugInfo = { ...debugInfo };
    if (safeDebugInfo.sdkObject) {
      safeDebugInfo.sdkObject = '[MercadoPago SDK Object]';
    }
    
    console.log('Debug Info:', safeDebugInfo);
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
