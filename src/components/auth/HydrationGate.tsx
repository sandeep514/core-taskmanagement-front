import { useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { PageLoader } from '@/components/ui/loading'

/** Wait for zustand persist rehydration before auth-gated routes render. */
export function HydrationGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(() => useAuthStore.persist.hasHydrated())

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setReady(true)
    })
    setReady(useAuthStore.persist.hasHydrated())
    return unsub
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader />
      </div>
    )
  }

  return children
}
