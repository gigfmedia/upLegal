import { useAIUsage, formatTokens } from '@/hooks/useAIUsage';

/**
 * Medidor sutil de consumo de IA del mes en curso (Fase 3.6).
 * Muestra el uso real (tokens/créditos) sin anunciar límites comerciales, ya
 * que aún no hay créditos definidos: solo sirve para visibilidad y cost tracking.
 */
export function AIUsageMeter() {
  const { data, isLoading } = useAIUsage();

  if (isLoading || !data) return null;

  const { total_tokens: tokens, total_credits: credits } = data.usage;

  const pctOfProtection =
    data.protection_limits.monthly_tokens > 0
      ? Math.min(100, Math.round((tokens / data.protection_limits.monthly_tokens) * 100))
      : 0;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      title="Consumo de IA del mes en curso"
    >
      <span className="text-xs font-medium text-gray-500">Uso de IA este mes</span>
      <span className="font-semibold text-gray-900">{formatTokens(tokens)} tokens</span>
      {credits > 0 && (
        <span className="text-xs text-gray-500">
          ≈ {new Intl.NumberFormat('es-CL').format(credits)} créditos
        </span>
      )}
      {pctOfProtection > 0 && (
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${
              pctOfProtection >= 90 ? 'bg-red-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${pctOfProtection}%` }}
          />
        </div>
      )}
    </div>
  );
}
