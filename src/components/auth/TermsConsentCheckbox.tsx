import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { PRIVACY_PATH, TERMS_PATH } from '@/lib/legalConsent';
import { cn } from '@/lib/utils';

/**
 * FASE 5.6 — checkbox obligatorio de Términos + Privacidad.
 * Desmarcado por defecto, label clickeable, links independientes en nueva pestaña.
 */
export function TermsConsentCheckbox({
  checked,
  onCheckedChange,
  dark = false,
  error,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  dark?: boolean;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="legal-consent"
        className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug"
      >
        <Checkbox
          id="legal-consent"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-0.5 shrink-0"
          aria-describedby={error ? 'legal-consent-error' : undefined}
          aria-invalid={!!error}
        />
        <span className={cn(dark ? 'text-slate-200' : 'text-gray-700')}>
          Acepto los{' '}
          <Link
            to={TERMS_PATH}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-green-700 underline-offset-2 hover:underline"
          >
            Términos y Condiciones
          </Link>{' '}
          y declaro haber leído la{' '}
          <Link
            to={PRIVACY_PATH}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-green-700 underline-offset-2 hover:underline"
          >
            Política de Privacidad
          </Link>
          .
        </span>
      </label>
      {error && (
        <p id="legal-consent-error" role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
