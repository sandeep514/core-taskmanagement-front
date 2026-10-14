import { useQuery } from '@tanstack/react-query'
import { fetchMyTopStatus, type MyTopStatus } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { lastWorkingDateKey, todayKey, TOP_TASKS_DAILY_MIN } from '@/types'

export interface TopStatusClient extends MyTopStatus {}

/** Fallback when the status endpoint is unreachable (e.g. admin portal). */
function localFallback(): MyTopStatus {
  const today = todayKey()
  const last_date = lastWorkingDateKey()
  return {
    today,
    last_date,
    min_required: TOP_TASKS_DAILY_MIN,
    today_count: 0,
    last_count: 0,
    last_eligible: last_date !== today,
  }
}

/**
 * Current user's Top compliance for today + last working date.
 * Employee / client portals hit the server; admin / HR (no personal Top set)
 * always get both dates offered.
 */
export function useMyTopStatus() {
  const role = useAuthStore((s) => s.user?.role)

  const query = useQuery({
    queryKey: ['my-top-status'],
    queryFn: fetchMyTopStatus,
    enabled: role === 'employee' || role === 'client',
    staleTime: 30_000,
    retry: 1,
  })

  if (role === 'admin' || role === 'hr' || role === 'ea') {
    const f = localFallback()
    return {
      ...query,
      data: { ...f, last_eligible: true } as MyTopStatus,
      isStaffOverride: true as const,
    }
  }

  return {
    ...query,
    data: (query.data ?? localFallback()) as MyTopStatus,
    isStaffOverride: false as const,
  }
}
