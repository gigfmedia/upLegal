import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  MessagesSquare,
  MessageCircle,
  UserPlus,
  TrendingUp,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const RANGES = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
] as const;

type Range = (typeof RANGES)[number]['value'];

interface ChatEventRow {
  created_at: string;
  event_type: string;
  visitor_id: string | null;
}

interface ChatAnalyticsPayload {
  totals: { users: number; conversations: number; messages: number; leads: number };
  daily: {
    events: ChatEventRow[];
    leads: string[];
  };
}

interface DailyPoint {
  date: string;
  users: number;
  conversations: number;
  messages: number;
  leads: number;
}

// Serie diaria continua (todos los días del rango, rellenando los vacíos con 0)
// para que el gráfico no tenga huecos. Usuarios únicos por día (no suma acumulada).
function buildDailySerie(payload: ChatAnalyticsPayload, range: Range): DailyPoint[] {
  const { events, leads } = payload.daily;
  const end = startOfDay(new Date());
  const days =
    range === '7d' ? 7 : range === '30d' ? 30 : 90;

  const usersByDay = new Map<string, Set<string>>();
  const convByDay = new Map<string, number>();
  const msgByDay = new Map<string, number>();
  const leadsByDay = new Map<string, number>();

  for (const ev of events) {
    const key = format(new Date(ev.created_at), 'yyyy-MM-dd');
    if (ev.event_type === 'conversation_started') convByDay.set(key, (convByDay.get(key) ?? 0) + 1);
    if (ev.event_type === 'message_sent') msgByDay.set(key, (msgByDay.get(key) ?? 0) + 1);
    if (ev.visitor_id) {
      const set = usersByDay.get(key) ?? new Set<string>();
      set.add(ev.visitor_id);
      usersByDay.set(key, set);
    }
  }

  for (const ts of leads) {
    const key = format(new Date(ts), 'yyyy-MM-dd');
    leadsByDay.set(key, (leadsByDay.get(key) ?? 0) + 1);
  }

  const serie: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDay(subDays(end, i));
    const key = format(day, 'yyyy-MM-dd');
    serie.push({
      date: format(day, 'd MMM', { locale: es }),
      users: usersByDay.get(key)?.size ?? 0,
      conversations: convByDay.get(key) ?? 0,
      messages: msgByDay.get(key) ?? 0,
      leads: leadsByDay.get(key) ?? 0,
    });
  }
  return serie;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function ChatAnalytics() {
  const [range, setRange] = useState<Range>('30d');

  const { data, isLoading, isError, refetch } = useQuery<ChatAnalyticsPayload>({
    queryKey: ['chat-analytics', range],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const to = new Date().toISOString();
      const from = subDays(new Date(), range === '7d' ? 7 : range === '30d' ? 30 : 90).toISOString();
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(
        `${apiBase}/api/admin/chat-analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No pudimos cargar las métricas del chat.');
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  const serie = useMemo(() => (data ? buildDailySerie(data, range) : []), [data, range]);

  const totals = data?.totals;
  const conversionRate =
    totals && totals.users > 0 ? ((totals.leads / totals.users) * 100).toFixed(1) : '0';
  const avgMessages =
    totals && totals.conversations > 0
      ? (totals.messages / totals.conversations).toFixed(1)
      : '0';

  const isEmpty = !isLoading && !isError && totals && totals.users === 0 && totals.leads === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chat</h2>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              No pudimos cargar las métricas del chat.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {totals ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Users} label="Usuarios" value={String(totals.users)} hint="Visitantes únicos que interactuaron con el chat" />
          <StatCard icon={MessagesSquare} label="Conversaciones" value={String(totals.conversations)} hint="Conversaciones iniciadas (widget)" />
          <StatCard icon={MessageCircle} label="Mensajes enviados" value={String(totals.messages)} hint="Mensajes de usuario procesados" />
          <StatCard icon={UserPlus} label="Leads generados" value={String(totals.leads)} hint="Leads de reserva en el período" />
          <StatCard icon={TrendingUp} label="Conv. a lead" value={`${conversionRate}%`} hint="Leads / usuarios de chat" />
        </div>
      ) : null}

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Sin actividad todavía</p>
              <p className="text-xs text-muted-foreground">
                Aún no hay interacciones del chat público en este período.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Uso del chat</CardTitle>
              <CardDescription>
                Usuarios únicos y conversaciones iniciadas por día.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                {data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(t: string, i: number) =>
                          serie.length <= 12 ? t : i % 2 === 0 ? t : ''
                        }
                        interval="preserveStartEnd"
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="users"
                        name="Usuarios únicos"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="conversations"
                        name="Conversaciones"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actividad del chat</CardTitle>
              <CardDescription>Resumen agregado del período seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={Users} label="Usuarios únicos" value={String(totals?.users ?? 0)} />
                <StatCard icon={MessagesSquare} label="Conversaciones iniciadas" value={String(totals?.conversations ?? 0)} />
                <StatCard icon={MessageCircle} label="Mensajes enviados" value={String(totals?.messages ?? 0)} />
                <StatCard
                  icon={TrendingUp}
                  label="Promedio mensajes / conversación"
                  value={avgMessages}
                />
                <StatCard icon={UserPlus} label="Leads generados" value={String(totals?.leads ?? 0)} />
                <StatCard icon={TrendingUp} label="Tasa de conversión a lead" value={`${conversionRate}%`} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}