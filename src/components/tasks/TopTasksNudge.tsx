import { CalendarClock, Star } from 'lucide-react'
import { TOP_TASKS_DAILY_MIN } from '@/types'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface TopTasksNudgeProps {
  /** Global total across all projects (assigned to me) for today. This is what the min applies to. */
  marked: number
  min?: number
  className?: string
  compact?: boolean
  /** Optional per-project count to show as context, e.g. 1 in this project of 3 total. */
  projectMarked?: number
  /** Last working date (backfill) — shown only while its Top set is incomplete. */
  lastDate?: string | null
  lastMarked?: number | null
}

export function TopTasksNudge({ marked, min = TOP_TASKS_DAILY_MIN, className, compact = false, projectMarked, lastDate, lastMarked }: TopTasksNudgeProps) {
  const done = marked >= min
  const pct = Math.min(100, Math.round((marked / min) * 100))
  // Last date needs attention only while its Top-3 set is incomplete.
  const lastPending =
    lastDate != null && lastMarked != null && lastMarked < min

  return (
    <div className={cn('space-y-2', className)}>
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3.5 py-2.5',
        done
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-amber-200 bg-amber-50/70',
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
        )}
      >
        <Star className="h-4 w-4" fill="currentColor" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">
          {done ? (
            <span className="text-emerald-900">
              {marked} Top {marked === 1 ? 'task' : 'tasks'} marked for today
            </span>
          ) : (
            <span className="text-amber-900">
              {marked}/{min} Top tasks marked — pick at least {min - marked} more
            </span>
          )}
        </p>
        {projectMarked !== undefined && projectMarked !== marked && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {projectMarked} in this project · {marked} total across all projects
          </p>
        )}
        {!compact && (
          <>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/80">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  done ? 'bg-emerald-500' : 'bg-amber-500',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            {!done && (
              <p className="mt-1 text-xs text-amber-800/80">
                Star your most important tasks so the day stays focused. You can mark more than {min}.
                Total counts across all projects.
              </p>
            )}
          </>
        )}
        {compact && projectMarked !== undefined && projectMarked !== marked && (
          <p className="mt-1 text-xs text-muted-foreground">
            Total counts across all projects.
          </p>
        )}
      </div>
    </div>
    {lastPending && (
      <div
        className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/70 px-3.5 py-2.5"
        role="status"
        aria-live="polite"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
          <CalendarClock className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight text-orange-900">
            {lastMarked}/{min} Top tasks for {formatDate(lastDate)} — mark {min - (lastMarked ?? 0)} more
          </p>
          <p className="mt-0.5 text-xs text-orange-800/80">
            Missed the last working day? Star a task and choose the last date to backfill.
          </p>
        </div>
      </div>
    )}
    </div>
  )
}
