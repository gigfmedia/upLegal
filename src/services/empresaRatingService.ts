import type { CompanyRating, CreateCompanyRatingInput, LawyerRatingStats } from '@/types/empresas'

export async function getRequestRating(requestId: string): Promise<CompanyRating | null> {
  const res = await fetch(`/api/empresas/ratings?requestId=${requestId}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.rating || null
}

export async function createCompanyRating(input: CreateCompanyRatingInput): Promise<CompanyRating> {
  const session = await (await import('@/lib/supabaseClient')).supabase.auth.getSession()
  const token = session.data.session?.access_token
  const res = await fetch('/api/empresas/ratings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al crear calificación')
  }
  return res.json()
}

export async function getLawyerRatingStats(lawyerId: string): Promise<LawyerRatingStats | null> {
  const res = await fetch(`/api/empresas/ratings/lawyer/${lawyerId}/stats`)
  if (!res.ok) return null
  const data = await res.json()
  return data.stats || null
}
