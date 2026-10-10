/**
 * FASE 1.7 — Tab "Pro" del panel admin: KPIs desde Supabase (sin PostHog/GA4).
 * Solo agregados (conteos, tasas, montos). Nunca filas por abogado ni PII.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

type ProKpis = {
  generated_at: string;
  window: { from: string; to: string };
  kpi_new_lawyers_by_week: { week_start: string; new_lawyers: number }[];
  kpi_activation_7d: { week_start: string; registered: number; activated_7d: number; activation_rate_7d: number | null; pending: number }[];
  kpi_management: { activated_lawyers: number; with_task_ever: number; with_next_action_now: number; with_either: number };
  kpi_docs_ai: { lawyers_with_docs_or_ai: number };
  kpi_retention: { first_activation_week: string; activated: number; returned_week_after: number; retention_rate: number | null; pending: number }[];
  kpi_pro_conversion: { active_subscriptions: number; paid_lawyers: number; active_amount_clp: number };
  notes: string[];
};

const fmtRate = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);
const fmtClp = (v: number) => `$${Number(v || 0).toLocaleString('es-CL')}`;

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  );
}

export default function ProKpisTab() {
  const { data, isLoading, error } = useQuery<ProKpis>({
    queryKey: ['pro-kpis'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/pro-kpis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar KPIs de Pro');
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando KPIs de Pro…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" /> No se pudieron cargar los KPIs de Pro.
      </div>
    );
  }

  const conv = data.kpi_pro_conversion;
  const mgmt = data.kpi_management;
  const totalNew = data.kpi_new_lawyers_by_week.reduce((acc, w) => acc + w.new_lawyers, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Abogados nuevos (ventana)" value={String(totalNew)} hint="Cuentas con rol abogado, sin pruebas" />
        <KpiCard
          title="Activación 7d (última cohorte completa)"
          value={fmtRate([...data.kpi_activation_7d].reverse().find((c) => c.activation_rate_7d !== null)?.activation_rate_7d ?? null)}
          hint="Primer caso o grant ≤7 días del registro"
        />
        <KpiCard
          title="Suscripciones Pro activas"
          value={String(conv.active_subscriptions)}
          hint={`${conv.paid_lawyers} con pago confirmado · Monto vigente ${fmtClp(conv.active_amount_clp)} (no es MRR normalizado)`}
        />
        <KpiCard
          title="Adopción de gestión"
          value={`${mgmt.with_either}/${mgmt.activated_lawyers}`}
          hint={`${mgmt.with_task_ever} con tarea · ${mgmt.with_next_action_now} con próxima gestión vigente`}
        />
        <KpiCard
          title="Documentos o IA real"
          value={String(data.kpi_docs_ai.lawyers_with_docs_or_ai)}
          hint="Doc ready, análisis, respuesta IA u operación medida"
        />
        <KpiCard
          title="Retención semana siguiente"
          value={fmtRate([...data.kpi_retention].reverse().find((c) => c.retention_rate !== null)?.retention_rate ?? null)}
          hint="Acción significativa en (d+1, d+7] tras activar"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cohortes semanales — registro → activación</CardTitle>
          <CardDescription>Cohortes incompletas van en pending, fuera del denominador.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 font-semibold">Semana</th>
                <th className="py-2 pr-4 font-semibold">Registrados</th>
                <th className="py-2 pr-4 font-semibold">Activados 7d</th>
                <th className="py-2 pr-4 font-semibold">Tasa</th>
                <th className="py-2 font-semibold">Pending</th>
              </tr>
            </thead>
            <tbody>
              {data.kpi_activation_7d.map((c) => (
                <tr key={c.week_start} className="border-b">
                  <td className="py-2 pr-4">{c.week_start}</td>
                  <td className="py-2 pr-4">{c.registered}</td>
                  <td className="py-2 pr-4">{c.activated_7d}</td>
                  <td className="py-2 pr-4">{fmtRate(c.activation_rate_7d)}</td>
                  <td className="py-2">{c.pending}</td>
                </tr>
              ))}
              {data.kpi_activation_7d.length === 0 && (
                <tr>
                  <td className="py-2 text-muted-foreground" colSpan={5}>Sin cohortes en la ventana.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas de medición</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
            {data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Generado: {data.generated_at}</p>
        </CardContent>
      </Card>
    </div>
  );
}
