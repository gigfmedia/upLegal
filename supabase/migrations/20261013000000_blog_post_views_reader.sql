-- Vistas de posts del blog desde analítica propia (page_views).
-- Solo devuelve conteos agregados por ruta (sin datos de visitante).
-- SECURITY DEFINER porque page_views no tiene SELECT público.
CREATE OR REPLACE FUNCTION public.get_blog_post_views(paths text[])
RETURNS TABLE (path text, views bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.page_path AS path, count(*)::bigint AS views
  FROM public.page_views p
  WHERE p.page_path = ANY (paths)
  GROUP BY p.page_path;
END $$;
REVOKE ALL ON FUNCTION public.get_blog_post_views(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_blog_post_views(text[]) TO anon, authenticated;
