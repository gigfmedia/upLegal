-- LegalUp AI: límite de 20 MB en bytes para documentos.
-- 20 MB en bytes = 20971520. El bucket se mantiene privado (public = false) y
-- solo acepta PDF, de modo que el límite real lo impone la infraestructura de
-- Storage incluso si se manipula el frontend.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-documents',
  'ai-documents',
  false,
  20971520, -- 20 MB en bytes
  array['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = excluded.public;
