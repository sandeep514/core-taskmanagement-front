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
import { cn } from '@/lib/utils'

export type PriorityFilter = 'all' | TaskPriority
export type TaskTypeFilter = 'all' | TaskType

interface TaskBoardFiltersProps {
  priority: PriorityFilter
  taskType: TaskTypeFilter
  onPriorityChange: (value: PriorityFilter) => void
  onTaskTypeChange: (value: TaskTypeFilter) => void
  className?: string
}

export function TaskBoardFilters({
  priority,
  taskType,
  onPriorityChange,
  onTaskTypeChange,
  className,
}: TaskBoardFiltersProps) {
  const hasActive = priority !== 'all' || taskType !== 'all'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
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
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}

/** Client-side filter helper for kanban / list views. */
export function filterTasksByPriorityAndType<
  T extends { priority: TaskPriority; task_type?: TaskType | null },
>(tasks: T[], priority: PriorityFilter, taskType: TaskTypeFilter): T[] {
  return tasks.filter((task) => {
    if (priority !== 'all' && task.priority !== priority) return false
    if (taskType !== 'all' && (task.task_type ?? 'general') !== taskType) return false
    return true
  })
}
