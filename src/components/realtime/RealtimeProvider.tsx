import { useEffect } from 'react'
import { disconnectEcho, getEcho } from '@/lib/echo'
import { useAuthStore } from '@/stores/authStore'

/**
 * Keeps Echo connected while authenticated; tears down on logout.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectEcho()
      return
    }
    getEcho(token)
    return () => {
      // Keep connection across in-app navigation; only disconnect on logout
      // handled when token becomes null.
    }
  }, [token, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectEcho()
    }
  }, [isAuthenticated])

  return <>{children}</>
}
