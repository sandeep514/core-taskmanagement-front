import { Search, X } from 'lucide-react'
import type { TaskPriority, TaskType } from '@/types'
import { TASK_PRIORITIES, TASK_TYPES } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type PriorityFilter = 'all' | TaskPriority
export type TaskTypeFilter = 'all' | TaskType

interface TaskBoardFiltersProps {
  priority: PriorityFilter
  taskType: TaskTypeFilter
  onPriorityChange: (value: PriorityFilter) => void
  onTaskTypeChange: (value: TaskTypeFilter) => void
  /** Search by task #, title, or description */
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  className?: string
}

export function TaskBoardFilters({
  priority,
  taskType,
  onPriorityChange,
  onTaskTypeChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search by #, title, or description…',
  className,
}: TaskBoardFiltersProps) {
  const hasActive =
    priority !== 'all' || taskType !== 'all' || Boolean(search?.trim())

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onSearchChange != null && (
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-9 pr-8 bg-background"
          />
          {(search ?? '').length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <Select
        value={priority}
        onValueChange={(v) => onPriorityChange(v as PriorityFilter)}
      >
        <SelectTrigger className="w-[150px] h-9 bg-background">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={taskType}
        onValueChange={(v) => onTaskTypeChange(v as TaskTypeFilter)}
      >
        <SelectTrigger className="w-[160px] h-9 bg-background">
          <SelectValue placeholder="Task type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All task types</SelectItem>
          {TASK_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={() => {
            onPriorityChange('all')
            onTaskTypeChange('all')
            onSearchChange?.('')
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}

/** Match task id (#123 / 123), title, or details/description. */
export function matchesTaskSearch(
  task: { id: number; title: string; details?: string | null },
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const idStr = String(task.id)
  const idHash = `#${task.id}`
  if (
    idStr === q ||
    idHash === q ||
    idStr.includes(q) ||
    idHash.includes(q) ||
    (q.startsWith('#') && idStr.includes(q.slice(1)))
  ) {
    // still allow text match below for partials like "12" in title
  }

  const hay = `${idStr} ${idHash} ${task.title} ${task.details ?? ''}`.toLowerCase()
  return hay.includes(q)
}

/** Client-side filter helper for kanban / list views. */
export function filterTasksByPriorityAndType<
  T extends { id: number; title: string; details?: string | null; priority: TaskPriority; task_type?: TaskType | null },
>(
  tasks: T[],
  priority: PriorityFilter,
  taskType: TaskTypeFilter,
  search = '',
): T[] {
  return tasks.filter((task) => {
    if (priority !== 'all' && task.priority !== priority) return false
    if (taskType !== 'all' && (task.task_type ?? 'general') !== taskType) return false
    if (!matchesTaskSearch(task, search)) return false
    return true
  })
}
