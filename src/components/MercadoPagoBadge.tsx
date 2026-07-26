import { Lock } from 'lucide-react';

interface PaymentMethodsProps {
  className?: string;
}

export const PaymentMethods = ({ className = '' }: PaymentMethodsProps) => {
  return (
    <div className={`mt-5 rounded-xl border border-gray-200 bg-white p-5 gap-4 sm:gap-6 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Lock className="h-5 w-5 text-blue-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900 text-left">
            Pagos seguros con Mercado Pago
          </p>
          <p className="text-xs text-gray-600 text-left mt-0.5">
            Tarjeta de crédito y débito · Suscripción mensual
          </p>
        </div>
        <div className="flex-shrink-0">
          <img
            src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/7.4.9/mercadopago/logo__large@2x.png"
            alt="Mercado Pago"
            className="h-6 w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};