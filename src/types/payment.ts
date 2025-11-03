export interface Payment {
  id: string;
  user_id: string;
  lawyer_id: string;
  service_id?: string;
  amount: number; // in cents (with client surcharge)
  original_amount: number; // in cents (without surcharge)
  client_surcharge: number; // in cents (10% of original amount)
  platform_fee: number; // in cents (20% of original amount)
  lawyer_amount: number; // in cents (80% of original amount)
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
  clientSurcharge: number; // in cents (10% of original amount)
  platformFee: number; // in cents (20% of original amount)
  lawyerAmount: number; // in cents (80% of original amount)
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
