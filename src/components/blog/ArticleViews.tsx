import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export function formatViews(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1000000) {
    const k = n / 1000;
    return `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return n.toLocaleString('es-CL');
}

const cache = new Map<string, number | null>();

/** Vistas agregadas de uno o varios slugs (`/blog/<slug>`) vía RPC solo-conteos. */
export function useBlogPostViews(slugs: string[]): Map<string, number> {
  const [views, setViews] = useState<Map<string, number>>(new Map());
  const key = [...slugs].sort().join(',');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const missing = slugs.filter((s) => !cache.has(`/blog/${s}`));
    const cached = new Map<string, number>();
    for (const s of slugs) {
      const v = cache.get(`/blog/${s}`);
      if (v != null) cached.set(s, v);
    }
    if (cached.size > 0) setViews(cached);
    if (missing.length === 0) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc(
          'get_blog_post_views',
          { paths: missing.map((s) => `/blog/${s}`) }
        );
        if (error || cancelled) return;
        const next = new Map(cached);
        for (const row of (data ?? []) as { path: string; views: number }[]) {
          const slug = row.path.replace(/^\/blog\//, '');
          cache.set(row.path, row.views);
          next.set(slug, row.views);
        }
        if (!cancelled) setViews(next);
      } catch {
        if (!cancelled) setViews(cached);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return views;
}

/** Mínimo para mostrar: debajo de 1k se oculta (evita comparar 13.5k con 65). */
export const MIN_VIEWS_TO_DISPLAY = 1000;

export function ArticleViews({ slug, className = '' }: { slug: string; className?: string }) {
  const views = useBlogPostViews([slug]);
  const n = views.get(slug);
  if (n == null || n < MIN_VIEWS_TO_DISPLAY) return null;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={`${formatViews(n)} vistas`}>
      <Eye className="h-4 w-4" aria-hidden="true" />
      <span>{formatViews(n)} vistas</span>
    </span>
  );
}
