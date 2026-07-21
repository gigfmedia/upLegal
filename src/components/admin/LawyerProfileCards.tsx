import { useState } from 'react';
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Users } from 'lucide-react';
import { useLawyerProfileViews, type LawyerViewStats } from '@/hooks/useLawyerProfileViews';

type SortKey = 'views' | 'name';

export default function LawyerProfileCards() {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('views');
  const { data: lawyers = [], isLoading } = useLawyerProfileViews(range);

  const sorted = [...lawyers].sort((a, b) =>
    sortBy === 'views' ? b.totalViews - a.totalViews : a.lawyerName.localeCompare(b.lawyerName)
  );

  const maxViews = sorted[0]?.totalViews || 1;

  const RANGES = [
    { label: '7 días', value: '7d' as const },
    { label: '30 días', value: '30d' as const },
    { label: '90 días', value: '90d' as const },
    { label: 'Todo', value: 'all' as const },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (lawyers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Vistas por abogado
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-xs border rounded-md px-2 py-1 bg-white"
          >
            <option value="views">Más vistos</option>
            <option value="name">Nombre</option>
          </select>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.slice(0, 15).map((lawyer) => (
          <LawyerCard key={lawyer.lawyerId} lawyer={lawyer} maxViews={maxViews} />
        ))}
      </div>
    </div>
  );
}

function LawyerCard({ lawyer, maxViews }: { lawyer: LawyerViewStats; maxViews: number }) {
  const pct = maxViews > 0 ? (lawyer.totalViews / maxViews) * 100 : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate">{lawyer.lawyerName}</CardTitle>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-sm font-bold">{lawyer.totalViews}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lawyer.dailyData}>
              <defs>
                <linearGradient id={`grad-${lawyer.lawyerId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="views"
                stroke="#16a34a"
                strokeWidth={1.5}
                fill={`url(#grad-${lawyer.lawyerId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
