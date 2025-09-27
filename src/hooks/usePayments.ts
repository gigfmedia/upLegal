import { useState, useEffect } from 'react';
import { Payment, PaymentWithDetails } from '@/types/payment';
import {
  createPayment,
  getPaymentById,
  getPaymentsByUser,
  getLawyerEarnings,
} from '@/services/paymentService';

export const usePayments = (userId?: string) => {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    pendingTransfers: 0,
  });

  const fetchPayments = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getPaymentsByUser(userId);
      setPayments(data);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch payments'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEarnings = async () => {
    if (!userId) return;
    
    try {
      const data = await getLawyerEarnings(userId);
      setEarnings(data);
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
    }
  };

  const initializePayment = async (input: {
    lawyerId: string;
    serviceId?: string;
    amount: number;
    platformFee: number;
    lawyerAmount: number;
    metadata?: Record<string, unknown>;
  }) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const payment = await createPayment({
        userId,
        lawyerId: input.lawyerId,
        serviceId: input.serviceId,
        amount: input.amount,
        platformFee: input.platformFee,
        lawyerAmount: input.lawyerAmount,
        metadata: input.metadata,
      });

      return payment;
    } catch (err) {
      console.error('Failed to create payment:', err);
      setError(err instanceof Error ? err : new Error('Failed to create payment'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    fetchPayments();
    fetchEarnings();
  };

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      fetchPayments();
      fetchEarnings();
    }
  }, [userId]);

  return {
    payments,
    earnings,
    isLoading,
    error,
    initializePayment,
    refreshPayments: fetchPayments,
    refreshEarnings: fetchEarnings,
    refreshData,
  };
};
