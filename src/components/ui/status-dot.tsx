import { cn } from '@/lib/utils'
import type { EntityStatus } from '@/types'

export function StatusDot({ status }: { status: EntityStatus }) {
  const active = status === 'active'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        active ? 'text-emerald-700' : 'text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn('h-2 w-2 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-300')}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}
