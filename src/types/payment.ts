export interface Payment {
  id: string;
  user_id: string;
  lawyer_id: string;
  service_id?: string;
  amount: number; // in cents (final total client paid)
  original_amount: number; // in cents (lawyer list price)
  client_surcharge: number; // in cents (platform surcharge to the client)
  client_surcharge_percent: number; // decimal representation (e.g., 0.1)
  platform_fee: number; // in cents (platform retention from original amount)
  platform_fee_percent: number; // decimal representation (e.g., 0.2)
  lawyer_amount: number; // in cents (amount to pay lawyer before payout)
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'disputed';
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  userId: string;
  lawyerId: string;
  serviceId?: string;
  amount: number; // in cents (with client surcharge)
  originalAmount: number; // in cents (without surcharge)
  clientSurcharge: number; // in cents (surcharge portion)
  clientSurchargePercent: number;
  platformFee: number; // in cents (platform fee portion)
  platformFeePercent: number;
  lawyerAmount: number; // in cents (originalAmount - platformFee)
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentWithDetails extends Payment {
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  lawyer: {
    id: string;
    full_name: string;
    email: string;
  };
  service?: {
    id: string;
    title: string;
    description: string;
  };
}
