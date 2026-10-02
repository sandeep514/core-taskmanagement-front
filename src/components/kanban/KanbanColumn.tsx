import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowUpDown, Check } from 'lucide-react'
import type { Task, TaskStatus } from '@/types'
import { TASK_STATUSES } from '@/types'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  KANBAN_SORT_OPTIONS,
  kanbanSortShortLabel,
  type KanbanSort,
} from '@/components/tasks/TaskBoardFilters'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  canMoveTask?: (task: Task) => boolean
  /** Effective sort for this column (resolved by the board). */
  sort?: KanbanSort
  onSortChange?: (status: TaskStatus, sort: KanbanSort) => void
  /** Bulk-select (To Do only): ids + toggles, supplied by the board. */
  selectedIds?: number[]
  onToggleSelect?: (taskId: number) => void
  onToggleAll?: () => void
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  canMoveTask,
  sort = 'auto',
  onSortChange,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: KanbanColumnProps) {
  const meta = TASK_STATUSES.find((s) => s.value === status)!
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: 'column', status },
  })

  const itemIds = tasks.map((t) => t.id)

  return (
    <div
      className={cn(
        'flex w-[280px] shrink-0 flex-col rounded-xl border border-border bg-secondary/40',
        isOver && 'ring-2 ring-primary/40 bg-accent/40',
      )}
    >
      <div className="flex items-center justify-between gap-1.5 px-3 py-2.5 border-b border-border/60">
        <span className="flex items-center gap-1.5 min-w-0">
          {status === 'todo' && onToggleAll && (
            <Checkbox
              checked={tasks.length > 0 && tasks.every((t) => selectedIds?.includes(t.id))}
              onCheckedChange={() => onToggleAll()}
              aria-label="Select all To Do tasks"
              title="Select all To Do tasks"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <span className={cn('rounded-md border px-2 py-0.5 text-xs font-semibold truncate', meta.color)}>
            {meta.label}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="text-xs font-medium text-muted-foreground bg-card rounded-full h-6 min-w-6 px-1.5 flex items-center justify-center border border-border">
            {tasks.length}
          </span>
          {onSortChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title={`Sort ${meta.label} column (now: ${kanbanSortShortLabel(sort, status)})`}
                  aria-label={`Sort ${meta.label} column`}
                  className="flex h-6 items-center gap-0.5 rounded-md border border-border bg-card px-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {kanbanSortShortLabel(sort, status)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {KANBAN_SORT_OPTIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    onClick={() => onSortChange(status, o.value)}
                    className="justify-between"
                  >
                    <span>{o.label}</span>
                    {sort === o.value && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="kanban-column-scroll scrollbar-thin flex flex-col gap-2.5 p-2.5 min-h-[160px]"
      >
        <SortableContext id={status} items={itemIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) =>
            status === 'todo' && onToggleSelect ? (
              <div key={task.id} className="flex items-start gap-2">
                <span
                  className="shrink-0 rounded bg-card/90 p-1 shadow-sm mt-2.5"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds?.includes(task.id) ?? false}
                    onCheckedChange={() => onToggleSelect(task.id)}
                    aria-label={`Select task #${task.id}`}
                    title="Select for bulk deactivate (To Do only)"
                  />
                </span>
                <div className="flex-1 min-w-0">
                  <TaskCard
                    task={task}
                    onClick={() => onTaskClick(task)}
                    dragDisabled={canMoveTask ? !canMoveTask(task) : false}
                  />
                </div>
              </div>
            ) : (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                dragDisabled={canMoveTask ? !canMoveTask(task) : false}
              />
            ),
          )}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-10 text-xs text-muted-foreground',
              isOver && 'border-primary bg-primary/5 text-primary',
            )}
          >
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  )
}
