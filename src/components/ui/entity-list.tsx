import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EntityStatus } from '@/types'
import { useListView } from '@/hooks/use-list-view'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusDot } from '@/components/ui/status-dot'
import { ListToolbar, type StatusFilter } from '@/components/ui/list-toolbar'

const HIDE_BELOW = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const

export interface EntityColumn<T> {
  header: string
  cell: (item: T) => ReactNode
  /** Hide the column below this breakpoint. */
  hideBelow?: keyof typeof HIDE_BELOW
  align?: 'left' | 'right'
}

interface Props<T extends { id: number; status: EntityStatus }> {
  items: T[]
  /** localStorage key for the remembered view, e.g. "departments:view". */
  viewKey: string
  /** Plural noun for the summary and search label, e.g. "departments". */
  noun: string
  /** First column (identity); Status and Actions are added automatically. */
  primary: EntityColumn<T>
  /** Columns shown after Status. */
  columns: EntityColumn<T>[]
  /** Text the search box matches against. */
  searchText: (item: T) => string
  renderActions: (item: T) => ReactNode
  renderCard: (item: T) => ReactNode
  cardGridClassName?: string
}

const alignClass = (a?: 'left' | 'right') => (a === 'right' ? 'text-right' : 'text-left')

export function EntityList<T extends { id: number; status: EntityStatus }>({
  items,
  viewKey,
  noun,
  primary,
  columns,
  searchText,
  renderActions,
  renderCard,
  cardGridClassName = 'sm:grid-cols-2 xl:grid-cols-3',
}: Props<T>) {
  const [view, setView] = useListView(viewKey)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(
      (i) =>
        (statusFilter === 'all' || i.status === statusFilter) &&
        (!q || searchText(i).toLowerCase().includes(q)),
    )
  }, [items, query, statusFilter, searchText])

  const cols = [primary, ...columns]

  return (
    <>
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        searchLabel={`Search ${noun}`}
        searchPlaceholder={`Search ${noun}`}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        summary={`${filtered.length} of ${items.length} ${noun}`}
        view={view}
        onViewChange={setView}
      />

      {!filtered.length ? (
        <EmptyState
          icon={Search}
          title={`No matching ${noun}`}
          description="Try a different search or status filter."
        />
      ) : view === 'cards' ? (
        <div className={cn('grid gap-4', cardGridClassName)}>
          {filtered.map((item) => (
            <div key={item.id}>{renderCard(item)}</div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className={cn('px-4 py-2.5 font-medium', alignClass(primary.align), primary.hideBelow && HIDE_BELOW[primary.hideBelow])}>
                  {primary.header}
                </th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Status</th>
                {columns.map((c) => (
                  <th
                    key={c.header}
                    scope="col"
                    className={cn('px-4 py-2.5 font-medium', alignClass(c.align), c.hideBelow && HIDE_BELOW[c.hideBelow])}
                  >
                    {c.header}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'group transition-colors hover:bg-muted/40 focus-within:bg-muted/40',
                    item.status !== 'active' && 'text-muted-foreground',
                  )}
                >
                  <td className={cn('px-4 py-2.5', alignClass(primary.align), primary.hideBelow && HIDE_BELOW[primary.hideBelow])}>
                    {primary.cell(item)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusDot status={item.status} />
                  </td>
                  {cols.slice(1).map((c) => (
                    <td
                      key={c.header}
                      className={cn('px-4 py-2.5', alignClass(c.align), c.hideBelow && HIDE_BELOW[c.hideBelow])}
                    >
                      {c.cell(item)}
                    </td>
                  ))}
                  <td className="px-4 py-1.5">
                    <div className="md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                      {renderActions(item)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
