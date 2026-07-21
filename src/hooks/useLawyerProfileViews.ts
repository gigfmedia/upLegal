import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export type LawyerViewStats = {
  lawyerId: string;
  lawyerName: string;
  totalViews: number;
  dailyData: { date: string; views: number }[];
};

function extractUuid(path: string): string | null {
  const match = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match?.[0] || null;
}

function getDateKey(iso: string): string {
  return iso.split('T')[0];
}

export function useLawyerProfileViews(range: '7d' | '30d' | '90d' | 'all') {
  return useQuery({
    queryKey: ['lawyer-profile-views', range],
    queryFn: async () => {
      const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;

      const [{ data: lawyers }, { data: views }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('role', 'lawyer'),
        supabase
          .from('page_views')
          .select('created_at, page_path')
          .ilike('page_path', '%/abogado/%')
          .order('created_at', { ascending: true }),
      ]);

      if (!views || views.length === 0) return [];

      const since = rangeDays
        ? (() => { const d = new Date(); d.setDate(d.getDate() - rangeDays); return d; })()
        : new Date('2026-01-01');
      const sinceIso = since.toISOString();
      const filtered = views.filter(v =>
        v.created_at >= sinceIso &&
        !v.page_path?.includes('localhost:3001') &&
        !v.referrer?.includes('localhost:3001')
      );

      const lawyerMap = new Map<string, LawyerViewStats>();
      const lawyerNames = new Map((lawyers || []).map(l => [l.id, `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Abogado']));

      for (const v of filtered) {
        const uuid = extractUuid(v.page_path);
        if (!uuid) continue;

        if (!lawyerMap.has(uuid)) {
          lawyerMap.set(uuid, {
            lawyerId: uuid,
            lawyerName: lawyerNames.get(uuid) || 'Abogado',
            totalViews: 0,
            dailyData: [],
          });
        }

        const entry = lawyerMap.get(uuid)!;
        entry.totalViews++;

        const day = getDateKey(v.created_at);
        const existing = entry.dailyData.find(d => d.date === day);
        if (existing) {
          existing.views++;
        } else {
          entry.dailyData.push({ date: day, views: 1 });
        }
      }

      return Array.from(lawyerMap.values())
        .sort((a, b) => b.totalViews - a.totalViews);
    },
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });
}
