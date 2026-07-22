import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { homePathForRole } from '@/lib/api'

interface ProtectedRouteProps {
  role: UserRole
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== role) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return <Outlet />
}
