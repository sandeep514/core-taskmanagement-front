import type { ReactNode } from 'react'
import { LayoutGrid, Rows3, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EntityStatus } from '@/types'
import type { ViewMode } from '@/hooks/use-list-view'
import { Input } from '@/components/ui/input'

export type StatusFilter = 'all' | EntityStatus

interface Props {
  query: string
  onQueryChange: (q: string) => void
  searchLabel: string
  searchPlaceholder: string
  statusFilter: StatusFilter
  onStatusFilterChange: (f: StatusFilter) => void
  /** e.g. "3 of 12 projects" */
  summary: string
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  /** Extra controls placed before the view toggle. */
  extra?: ReactNode
}

const segment = (selected: boolean) =>
  cn(
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
    selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  )

export function ListToolbar({
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  statusFilter,
  onStatusFilterChange,
  summary,
  view,
  onViewChange,
  extra,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          className="pl-9"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div
        role="group"
        aria-label="Filter by status"
        className="inline-flex rounded-lg border border-border bg-card p-0.5"
      >
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={statusFilter === f}
            onClick={() => onStatusFilterChange(f)}
            className={cn('rounded-md px-3 py-1.5 text-sm capitalize', segment(statusFilter === f))}
          >
            {f}
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {summary}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {extra}
        <div role="group" aria-label="View" className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {(
            [
              ['table', Rows3, 'Table view'],
              ['cards', LayoutGrid, 'Card view'],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={view === v}
              onClick={() => onViewChange(v)}
              className={cn('rounded-md p-1.5', segment(view === v))}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
