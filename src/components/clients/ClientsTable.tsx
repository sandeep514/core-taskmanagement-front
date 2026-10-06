import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Client } from '@/types'
import { EntityActions } from '@/components/ui/entity-actions'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusDot } from '@/components/ui/status-dot'

export type ClientSortKey = 'name' | 'status' | 'email'

interface ClientsTableProps {
  clients: Client[]
  onEdit: (client: Client) => void
  onToggle: (client: Client) => void
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

export function ClientsTable({ clients, onEdit, onToggle }: ClientsTableProps) {
  const [sort, setSort] = useState<{ key: ClientSortKey; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc',
  })

  const sorted = [...clients].sort((a, b) => {
    const cmp = String(a[sort.key]).localeCompare(String(b[sort.key]), undefined, {
      sensitivity: 'base',
    })
    return sort.dir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (key: ClientSortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )

  const SortHead = ({ k, label }: { k: ClientSortKey; label: string }) => {
    const Icon = sort.key === k ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
    return (
      <th
        scope="col"
        className="px-4 py-2.5 text-left font-medium"
        aria-sort={
          sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className="inline-flex items-center gap-1.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded"
        >
          {label}
          <Icon className={cn('h-3 w-3', sort.key !== k && 'opacity-40')} />
        </button>
      </th>
    )
  }

  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <SortHead k="name" label="Client" />
              <SortHead k="status" label="Status" />
              <SortHead k="email" label="Email" />
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Phone
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Access
              </th>
              <th scope="col" className="px-4 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((c) => (
              <tr
                key={c.id}
                className={cn(
                  'group transition-colors hover:bg-muted/40 focus-within:bg-muted/40',
                  c.status !== 'active' && 'text-muted-foreground',
                )}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={c.status !== 'active' ? 'bg-slate-100 text-slate-500' : undefined}
                      >
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground truncate max-w-[16rem]">
                      {c.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <StatusDot status={c.status} />
                </td>
                <td className="px-4 py-2.5">
                  <span className="block truncate max-w-[18rem]" title={c.email}>
                    {c.email}
                  </span>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">{c.mobile || '—'}</td>
                <td className="px-4 py-2.5">
                  {c.show_team_tasks ? (
                    <Badge variant="outline" className="font-normal whitespace-nowrap">
                      Team tasks
                    </Badge>
                  ) : (
                    <span aria-label="No extra access">—</span>
                  )}
                </td>
                <td className="px-4 py-1.5">
                  <div className="md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                    <EntityActions name={c.name} status={c.status} onEdit={() => onEdit(c)} onToggle={() => onToggle(c)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: compact two-line list */}
      <ul className="md:hidden divide-y divide-border rounded-xl border border-border bg-card">
        {sorted.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials(c.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    'truncate font-medium',
                    c.status !== 'active' && 'text-muted-foreground',
                  )}
                >
                  {c.name}
                </p>
                <StatusDot status={c.status} />
              </div>
              <p className="truncate text-xs text-muted-foreground">{c.email}</p>
            </div>
            <EntityActions name={c.name} status={c.status} onEdit={() => onEdit(c)} onToggle={() => onToggle(c)} />
          </li>
        ))}
      </ul>
    </>
  )
}
