import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, TrendingUp, CalendarDays, Activity, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileViews, type ProfileViewsRange } from '@/hooks/useProfileViews';

const RANGES: { label: string; value: ProfileViewsRange }[] = [
  { label: '7 días', value: '7d' },
  { label: '30 días', value: '30d' },
  { label: '90 días', value: '90d' },
  { label: 'Todo', value: 'all' },
];

function formatDate(dateStr: string, range: ProfileViewsRange): string {
  const d = parseISO(dateStr);
  if (range === '7d') return format(d, 'EEE', { locale: es });
  if (range === '30d') return format(d, 'd MMM', { locale: es });
  return format(d, 'd MMM', { locale: es });
}

export default function ProfileViewsChart() {
  const { user } = useAuth();
  const [range, setRange] = useState<ProfileViewsRange>('all');
  const { data: viewsData = [], isLoading, error } = useProfileViews(user?.id, range);

  const totalViews = viewsData.reduce((sum, d) => sum + d.views, 0);
  const daysWithData = viewsData.filter(d => d.views > 0).length;
  const dailyAvg = daysWithData > 0 ? (totalViews / daysWithData).toFixed(1) : '0';
  const bestDay = viewsData.reduce<{ date: string; views: number } | null>(
    (best, curr) => !best || curr.views > best.views ? curr : best,
    null,
  );

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {/* <Eye className="h-5 w-5" /> */}
            Vistas del perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mb-2" />
            <p className="text-sm">Error al cargar los datos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {/* <Eye className="h-5 w-5" /> */}
              Vistas del perfil
            </CardTitle>
            <CardDescription>
              Evolución de las visitas a tu perfil de abogado
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  range === r.value
                    ? 'bg-green-100 text-green-800'
                    : 'text-muted-foreground hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse space-y-4 w-full">
              <div className="h-48 bg-slate-100 rounded-lg" />
              <div className="flex gap-4">
                <div className="h-12 bg-slate-100 rounded-lg flex-1" />
                <div className="h-12 bg-slate-100 rounded-lg flex-1" />
                <div className="h-12 bg-slate-100 rounded-lg flex-1" />
              </div>
            </div>
          </div>
        ) : viewsData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Eye className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium mb-1">Sin visitas aún</p>
            <p className="text-xs">Las visitas a tu perfil aparecerán aquí cuando tengas actividad</p>
          </div>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => formatDate(val, range)}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(val) => format(parseISO(val), "PPP", { locale: es })}
                    formatter={(value: number) => [value, 'Visitas']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#16a34a"
                    strokeWidth={2}
                    fill="url(#viewsGradient)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <Activity className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Total</span>
                </div>
                <p className="text-xl font-bold">{totalViews}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Promedio diario</span>
                </div>
                <p className="text-xl font-bold">{dailyAvg}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Mejor día</span>
                </div>
                <p className="text-xl font-bold">{bestDay?.views || 0}</p>
                {bestDay && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(parseISO(bestDay.date), 'd MMM', { locale: es })}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
