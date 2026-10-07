import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatViews, ArticleViews } from '@/components/blog/ArticleViews';

const rpcMock = vi.fn();
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

describe('formatViews', () => {
  it('formatea compacto con k', () => {
    expect(formatViews(0)).toBe('0');
    expect(formatViews(578)).toBe('578');
    expect(formatViews(13490)).toBe('13.5k');
    expect(formatViews(20000)).toBe('20k');
  });
});

describe('ArticleViews', () => {
  it('muestra vistas del slug desde page_views agregadas', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ path: '/blog/mi-articulo', views: 13490 }],
      error: null,
    });
    const { container } = render(<ArticleViews slug="mi-articulo" />);
    await waitFor(() => expect(container.textContent).toContain('13.5k vistas'));
    expect(rpcMock).toHaveBeenCalledWith('get_blog_post_views', { paths: ['/blog/mi-articulo'] });
  });

  it('bajo 1k no renderiza nada (evita comparar 13.5k con 65)', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ path: '/blog/chico', views: 65 }],
      error: null,
    });
    const { container } = render(<ArticleViews slug="chico" />);
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});

describe('migración blog_post_views_reader', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261013000000_blog_post_views_reader.sql'),
    'utf8'
  );
  it('solo conteos agregados, sin PII', () => {
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('count(*)');
    expect(sql).not.toMatch(/user_agent|referrer|visitor_id/);
    expect(sql).toContain('GRANT EXECUTE');
  });
});
