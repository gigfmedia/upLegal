import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PaymentWithDetails } from '@/types/payment';
import { formatCurrency } from '@/lib/utils/currency';

interface PaymentListProps {
  payments: PaymentWithDetails[];
  isLoading: boolean;
  error: Error | null;
  type?: 'all' | 'incoming' | 'outgoing';
  className?: string;
}

export function PaymentList({ payments, isLoading, error, type = 'all', className = '' }: PaymentListProps) {
  // Filter payments based on type
  const filteredPayments = payments.filter(payment => {
    if (type === 'incoming') return payment.lawyer_id === payment.user_id;
    if (type === 'outgoing') return payment.user_id === payment.user_id;
    return true;
  });

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Error loading payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredPayments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>No payments found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {type === 'incoming' 
              ? 'You don\'t have any incoming payments yet.' 
              : type === 'outgoing'
              ? 'You haven\'t made any payments yet.'
              : 'No payments found.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          {type === 'incoming' ? 'Earnings' : type === 'outgoing' ? 'Payments' : 'All Payments'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>{type === 'incoming' ? 'From' : type === 'outgoing' ? 'To' : 'User'}</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {format(new Date(payment.created_at), 'PP', { locale: es })}
                </TableCell>
                <TableCell>
                  {type === 'incoming' 
                    ? payment.user?.full_name || 'Unknown'
                    : type === 'outgoing'
                    ? payment.lawyer?.full_name || 'Unknown'
                    : `${payment.user?.full_name} → ${payment.lawyer?.full_name}`}
                </TableCell>
                <TableCell>
                  {payment.service?.title || 'Consultation'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(
                    type === 'incoming' ? payment.lawyer_amount : payment.amount,
                    payment.currency
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    payment.status === 'succeeded' 
                      ? 'bg-green-100 text-green-800' 
                      : payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : payment.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
