export interface Payment {
  id: string;
  user_id: string;
  lawyer_id: string;
  service_id?: string;
  amount: number; // in cents
  platform_fee: number; // in cents
  lawyer_amount: number; // in cents
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'disputed';
  stripe_payment_intent_id?: string;
  stripe_transfer_id?: string;
  transfer_status?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  userId: string;
  lawyerId: string;
  serviceId?: string;
  amount: number; // in cents
  platformFee: number; // in cents
  lawyerAmount: number; // in cents
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
