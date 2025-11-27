import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const ADMIN_EMAIL = 'gigfmedia@icloud.com'

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  const isAdmin =
    !!user &&
    (user.email?.toLowerCase() === ADMIN_EMAIL ||
      (user.user_metadata?.role?.toLowerCase?.() === 'admin'))

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
