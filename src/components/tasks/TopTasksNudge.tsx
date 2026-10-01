import { Star } from 'lucide-react'
import { TOP_TASKS_DAILY_MIN } from '@/types'
import { cn } from '@/lib/utils'

interface TopTasksNudgeProps {
  marked: number
  min?: number
  className?: string
  compact?: boolean
}

export function TopTasksNudge({ marked, min = TOP_TASKS_DAILY_MIN, className, compact = false }: TopTasksNudgeProps) {
  const done = marked >= min
  const pct = Math.min(100, Math.round((marked / min) * 100))

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3.5 py-2.5',
        done
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-amber-200 bg-amber-50/70',
        className,
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
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
