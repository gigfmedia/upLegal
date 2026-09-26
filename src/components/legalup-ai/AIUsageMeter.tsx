import { useAIUsage, type AIAllowancePool } from '@/hooks/useAIUsage';

function PoolRow({ label, pool }: { label: string; pool: AIAllowancePool }) {
  const pct =
    pool.limit && pool.limit > 0
      ? Math.min(100, Math.round((pool.used / pool.limit) * 100))
      : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-900">
        {pool.used}
        {pool.limit != null ? ` / ${pool.limit}` : ''}
      </span>
      {pool.limit != null && (
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : 'bg-emerald-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Uso de IA del plan (4.38C Pro mensual, 4.44A primer caso lifetime).
 * Muestra cuotas comerciales y documentos almacenados.
 * La autoridad es server/DB; este componente solo visualiza.
 * Sin allowance resuelto, no renderiza nada.
 */
export function AIUsageMeter() {
  const { data, isLoading } = useAIUsage();

  if (isLoading || !data?.allowance) return null;

  const { allowance } = data;
  // 4.44A: lifetime free-Case allowance (sin reset mensual).
  const isLifetime = allowance.plan === 'free_case';

  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      title={isLifetime ? 'Uso incluido en tu primer caso' : 'Uso de IA incluido en tu plan este mes'}
    >
      <span className="text-xs font-medium text-gray-500">
        {isLifetime ? 'Tu primer caso incluye' : 'Uso de IA este mes'}
      </span>
      <PoolRow label="Consultas IA" pool={allowance.chat} />
      <PoolRow label="Análisis" pool={allowance.analysis} />
      {!isLifetime && <PoolRow label="Investigaciones" pool={allowance.research} />}
      <PoolRow label="Documentos" pool={allowance.documents} />
    </div>
  );
}
