import { supabase } from '@/lib/supabaseClient';

/** Authenticated transport for the private company endpoints. No visual changes. */
export async function companyApiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Debes iniciar sesión para continuar');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'No se pudo completar la operación de empresa');
  }
  return response;
}
