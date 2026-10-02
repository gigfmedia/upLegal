import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProPaymentHistory, type ProPayment } from '@/hooks/useProPaymentHistory';

export const PRO_PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  approved: { label: 'Pagado', className: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
  rejected: { label: 'Fallido', className: 'bg-red-100 text-red-700' },
  refused: { label: 'Fallido', className: 'bg-red-100 text-red-700' },
  refunded: { label: 'Reembolsado', className: 'bg-slate-200 text-slate-700' },
  charged_back: { label: 'Contracargo', className: 'bg-slate-200 text-slate-700' },
};

export function proPaymentStatusMeta(status: string): { label: string; className: string } {
  const known = PRO_PAYMENT_STATUS[status.toLowerCase()];
  if (known) return known;
  const label = status
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
  return { label, className: 'bg-slate-100 text-slate-600' };
}

export function formatProPaymentPlan(plan: string | null): string {
  if (plan === 'plus') return 'LegalUp Plus';
  return 'LegalUp Pro'; // pro o histórico NULL
}

export function formatProPaymentAmount(amount: number, currency: string): string {
  if (currency !== 'CLP') return `${Number(amount).toLocaleString('es-CL')} ${currency}`;
  return `$${Number(amount).toLocaleString('es-CL')}`;
}

export function formatProPaymentDate(paidAt: string | null): string {
  if (!paidAt) return '—';
  try {
    return format(parseISO(paidAt), 'd MMM yyyy', { locale: es });
  } catch {
    return paidAt;
  }
}

function PaymentRow({ payment }: { payment: ProPayment }) {
  const meta = proPaymentStatusMeta(payment.status);
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900">
          {formatProPaymentDate(payment.paid_at)}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {formatProPaymentPlan(payment.plan)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">
          {formatProPaymentAmount(payment.amount_clp, payment.currency)}
        </span>
        <Badge className={`${meta.className} border-0`}>{meta.label}</Badge>
      </span>
    </li>
  );
}

/**
 * FASE 5.2G — historial de cobros Pro. Solo fecha, plan, monto y estado.
 */
export function ProPaymentHistory() {
  const { payments, loading, error, initialLimit } = useProPaymentHistory();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? payments : payments.slice(0, initialLimit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptText className="h-4 w-4 text-gray-400" aria-hidden="true" />
          Historial de pagos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-muted-foreground">
            No pudimos cargar tu historial de pagos.
          </p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no tienes pagos registrados.</p>
        ) : (
          <>
            <ul className="space-y-0.5">
              {visible.map((p) => (
                <PaymentRow key={p.id} payment={p} />
              ))}
            </ul>
            {payments.length > initialLimit && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                {expanded ? (
                  <>Ver menos</>
                ) : (
                  <>Ver historial completo <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></>
                )}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
