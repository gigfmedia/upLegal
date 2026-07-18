import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabaseClient'
import { Users, Briefcase, Mail, Star } from 'lucide-react'
import type { Company } from '@/types/empresas'

interface LawyerData {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  rut: string
  email: string
  active_requests: number
  rating: number | null
  rating_count: number
}

export default function Lawyers() {
  const { company } = useOutletContext<{ company: Company }>()
  const [lawyers, setLawyers] = useState<LawyerData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLawyers = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return
      const res = await fetch('/api/empresas/lawyers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setLawyers(data.lawyers || [])
    } catch (error) {
      console.error('[Lawyers] Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchLawyers() }, [])

  const initials = (first: string, last: string) =>
    ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis abogados</h1>
          <p className="text-gray-600 mt-1">Abogados asignados a tu empresa</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-gray-400">Cargando abogados...</div>
      ) : lawyers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin abogados asignados</h3>
          <p className="text-gray-500">Cuando un administrador asigne un abogado a tu empresa, aparecerá aquí.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lawyers.map((lawyer) => (
            <Card key={lawyer.id} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={lawyer.avatar_url || undefined} />
                  <AvatarFallback className="bg-green-900 text-white text-sm font-medium">
                    {initials(lawyer.first_name, lawyer.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">
                    {lawyer.first_name} {lawyer.last_name}
                  </h3>
                  <p className="text-xs text-gray-500">{lawyer.rut}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Briefcase className="w-3 h-3" />
                      {lawyer.active_requests} cas{lawyer.active_requests === 1 ? 'o' : 'os'} activ{lawyer.active_requests === 1 ? 'o' : 'os'}
                    </span>
                    {/* <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Mail className="w-3 h-3" />
                      {lawyer.email}
                    </span> */}
                    {lawyer.rating !== null && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {lawyer.rating.toFixed(1)} ({lawyer.rating_count})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
