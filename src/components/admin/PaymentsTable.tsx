import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentWithDetails } from '@/types/payment';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

type PaymentsTableProps = {
  payments: PaymentWithDetails[];
  loading?: boolean;
};

const statusVariant = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-blue-100 text-blue-800',
} as const;

export function PaymentsTable({ payments, loading }: PaymentsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-black-600" />
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No se encontraron pagos
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Abogado</TableHead>
            <TableHead>Servicio</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.id.slice(0, 6)}...</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={payment.user?.avatar_url} alt={payment.user?.full_name} />
                    <AvatarFallback>{payment.user?.full_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{payment.user?.full_name || 'Usuario'}</div>
                    <div className="text-xs text-gray-500">{payment.user?.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={payment.lawyer?.avatar_url} alt={payment.lawyer?.full_name} />
                    <AvatarFallback>{payment.lawyer?.full_name?.[0] || 'A'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{payment.lawyer?.full_name || 'Abogado'}</div>
                    <div className="text-xs text-gray-500">{payment.lawyer?.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{payment.service?.title || payment.service_description || 'Servicio'}</div>
                <div className="text-xs text-gray-500">
                  ${payment.service?.price?.toLocaleString('es-CL') || '0'}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-medium">${payment.total_amount?.toLocaleString('es-CL') || payment.amount?.toLocaleString('es-CL') || '0'}</div>
                <div className="text-xs text-gray-500">
                  Comisión: ${Math.round((payment.total_amount || payment.amount || 0) * 0.2).toLocaleString('es-CL')}
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={`capitalize ${statusVariant[payment.status as keyof typeof statusVariant] || 'bg-gray-100'}`}
                >
                  {payment.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: es })}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(payment.created_at), 'HH:mm', { locale: es })}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
