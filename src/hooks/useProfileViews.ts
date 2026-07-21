import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

type DayViews = {
  date: string;
  views: number;
};

export type ProfileViewsRange = '7d' | '30d' | '90d' | 'all';

function getRangeDays(range: ProfileViewsRange): number | null {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case 'all': return null;
  }
}

function fillMissingDays(data: DayViews[], range: ProfileViewsRange): DayViews[] {
  const days = getRangeDays(range);
  if (!days) return data;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMap = new Map(data.map(d => [d.date, d.views]));
  const result: DayViews[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    result.push({ date: key, views: dayMap.get(key) || 0 });
  }

  return result;
}

export function useProfileViews(userId: string | undefined, range: ProfileViewsRange) {
  return useQuery({
    queryKey: ['profile-views', userId, range],
    queryFn: async () => {
      if (!userId) return [];

      const rangeDays = getRangeDays(range);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const isLawyer = profile?.role === 'lawyer';

      let query = supabase
        .from('page_views')
        .select('created_at')
        .ilike('page_path', '%/abogado/%')
        .not('page_path', 'ilike', '%localhost:3001%')
        .not('referrer', 'ilike', '%localhost:3001%')
        .order('created_at', { ascending: true });

      if (isLawyer) {
        query = query.ilike('page_path', `%/abogado/%${userId}%`);
      }

      const since = rangeDays
        ? (() => { const d = new Date(); d.setDate(d.getDate() - rangeDays); return d; })()
        : new Date('2026-01-01');
      query = query.gte('created_at', since.toISOString());

      const { data, error } = await query;

      if (error) {
        console.error('[useProfileViews] Error fetching page views:', error);
        throw error;
      }

      const dayMap: Record<string, number> = {};
      for (const v of data || []) {
        const day = v.created_at.split('T')[0];
        dayMap[day] = (dayMap[day] || 0) + 1;
      }

      const grouped = Object.entries(dayMap)
        .map(([date, views]) => ({ date, views }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return fillMissingDays(grouped, range);
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });
}
