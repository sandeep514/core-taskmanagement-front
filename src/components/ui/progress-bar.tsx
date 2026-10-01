import { cn } from '@/lib/utils'

interface ProgressBarProps {
  /** 0–100; values outside the range are clamped. */
  value: number
  className?: string
  /** Slimmer bar for dense surfaces like Kanban cards. */
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, className, size = 'md' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const complete = pct === 100

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'w-full overflow-hidden rounded-full bg-secondary',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          complete ? 'bg-emerald-500' : 'bg-primary',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
