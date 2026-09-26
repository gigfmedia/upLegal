import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CASE_STATUS_COLORS } from '@/lib/caseStatus';
import {
  BOOKING_STATUS_LABELS,
  CASE_SOURCE_LABELS,
  CASE_STATUS_LABELS,
} from '@/lib/caseLabels';
import type { LawyerCase } from '@/hooks/useLawyerCases';

function formatDate(value: string): string {
  try {
    return format(new Date(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

function formatPrice(value: number | null, currency: string): string | null {
  if (value == null) return null;
  const amount = Number(value).toLocaleString('es-CL');
  return currency === 'CLP' ? `$${amount}` : `${amount} ${currency}`;
}

type Props = {
  /** Merged live case (includes local edit saves). Title lives in the page header. */
  caseData: LawyerCase;
};

/**
 * 4.47A — main "Resumen del caso" (operational/business ficha).
 * Canonical `lawyer_cases` metadata only: status, client, area, origin,
 * booking relation, price and dates. The lawyer-authored description stays
 * in the separate CaseDescriptionCard; AI document insight stays in the
 * separate "Último análisis del caso" card. Same card for every plan
 * (no gates, no quota, no provider).
 */
export function CaseOverviewSummary({ caseData }: Props) {
  const price = formatPrice(caseData.price_clp, caseData.currency);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumen del caso</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">Estado</dt>
            <dd className="mt-0 sm:mt-1">
              <Badge className={`${CASE_STATUS_COLORS[caseData.status] || 'bg-gray-100 text-gray-800'} border-0`}>
                {CASE_STATUS_LABELS[caseData.status] || caseData.status}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">Cliente</dt>
            <dd className="mt-0 font-medium text-gray-900 sm:mt-1">
              {caseData.client ? (
                <Link
                  to={`/lawyer/clients/${caseData.client_id}`}
                  className="hover:underline"
                >
                  {caseData.client.name}
                </Link>
              ) : (
                <span className="font-normal text-muted-foreground">Sin cliente</span>
              )}
            </dd>
          </div>
          {caseData.practice_area && (
            <div className="flex items-center justify-between gap-3 sm:block">
              <dt className="text-muted-foreground">Área</dt>
              <dd className="mt-0 sm:mt-1">
                <Badge variant="secondary">{caseData.practice_area}</Badge>
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">Origen</dt>
            <dd className="mt-0 text-gray-900 sm:mt-1">
              {CASE_SOURCE_LABELS[caseData.source] || caseData.source}
            </dd>
          </div>
          {caseData.booking && (
            <div className="flex items-center justify-between gap-3 sm:block">
              <dt className="text-muted-foreground">Reserva</dt>
              <dd className="mt-0 text-gray-900 sm:mt-1">
                {caseData.booking.service_title || 'Reserva'}{' '}
                <span className="text-muted-foreground">
                  · {BOOKING_STATUS_LABELS[caseData.booking.status] || caseData.booking.status}
                </span>
              </dd>
            </div>
          )}
          {price && (
            <div className="flex items-center justify-between gap-3 sm:block">
              <dt className="text-muted-foreground">Monto</dt>
              <dd className="mt-0 text-gray-900 sm:mt-1">{price}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">Creado</dt>
            <dd className="mt-0 text-gray-900 sm:mt-1">{formatDate(caseData.created_at)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-muted-foreground">Actualizado</dt>
            <dd className="mt-0 text-gray-900 sm:mt-1">{formatDate(caseData.updated_at)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
