import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProjectCards } from './ProjectCards'
import { groupKey } from './group-key'
import { ProjectsTable, type ProjectListProps } from './ProjectsTable'

interface Props extends Omit<ProjectListProps, 'projects'> {
  projects: Project[]
  view: 'table' | 'cards'
  collapsed: Set<string>
  onToggleGroup: (key: string) => void
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')

export function ProjectsByClient({ projects, view, collapsed, onToggleGroup, ...list }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; items: Project[] }>()
    for (const p of projects) {
      const key = groupKey(p)
      const g = map.get(key) ?? { key, name: p.client?.name ?? 'No client', items: [] }
      g.items.push(p)
      map.set(key, g)
    }
    const rank = (s: string) => (s === 'active' ? 0 : 1)
    return [...map.values()]
      .map((g) => ({
        ...g,
        items: g.items.sort(
          (a, b) => rank(a.status) - rank(b.status) || a.project_name.localeCompare(b.project_name),
        ),
      }))
      .sort((a, b) =>
        a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
  }, [projects])

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const isOpen = !collapsed.has(g.key)
        const activeCount = g.items.filter((p) => p.status === 'active').length
        const panelId = `client-group-${g.key}`
        return (
          <section key={g.key} className="rounded-xl border border-border bg-card overflow-hidden">
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => onToggleGroup(g.key)}
                className="flex w-full items-center gap-3 bg-muted/50 px-4 py-3 text-left hover:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
              >
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', !isOpen && '-rotate-90')} />
                <Avatar className="h-7 w-7">
                  <AvatarFallback>{g.key === 'none' ? '—' : initials(g.name)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold">{g.name}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {g.items.length} {g.items.length === 1 ? 'project' : 'projects'} · {activeCount} active
                </span>
              </button>
            </h2>
            {isOpen && (
              <div id={panelId}>
                {view === 'table' ? (
                  <ProjectsTable projects={g.items} {...list} />
                ) : (
                  <ProjectCards projects={g.items} {...list} />
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
