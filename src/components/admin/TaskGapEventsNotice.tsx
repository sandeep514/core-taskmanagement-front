import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarOff } from 'lucide-react'
import { fetchTaskGapEvents } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { TASK_GAP_REASONS, type TaskGapEvent, type TaskGapReason } from '@/types'
import { formatDate } from '@/lib/utils'

function reasonLabel(reason: TaskGapReason): string {
  return TASK_GAP_REASONS.find((item) => item.value === reason)?.label ?? reason
}

function dateRangeLabel(event: Pick<TaskGapEvent, 'from_date' | 'to_date'>): string {
  const from = event.from_date.slice(0, 10)
  const to = event.to_date.slice(0, 10)
  if (from === to) return formatDate(from)
  return `${formatDate(from)} – ${formatDate(to)}`
}

/** Days in the report range when tasks were not expected. */
export function TaskGapEventsNotice({ from, to }: { from: string; to: string }) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  const { data } = useQuery({
    queryKey: ['task-gap-events', from, to],
    queryFn: () => fetchTaskGapEvents({ from, to }),
    enabled: Boolean(from && to && from <= to),
  })

  if (!data?.length) return null

  return (
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-950">
          <CalendarOff className="h-4 w-4" />
          Event or holiday in this report
        </p>
        {isAdmin && (
          <Link to="/admin/task-gap-events" className="text-xs font-medium text-amber-900 underline">
            Manage events
          </Link>
        )}
      </div>
      <p className="mt-1 text-xs text-amber-900">
        The event name is shown on those dates. Employees who worked can still add tasks, and those tasks stay in the report.
      </p>
      <ul className="mt-2 space-y-1 text-sm text-amber-950">
        {data.map((event) => (
          <li key={event.id}>
            <span className="font-medium">{dateRangeLabel(event)}</span>
            {' · '}
            {reasonLabel(event.reason)}
            {' · '}
            {event.title}
            {event.notes ? ` — ${event.notes}` : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}
