import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '@/types'
import { TASK_STATUSES } from '@/types'
import { cn } from '@/lib/utils'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  canMoveTask?: (task: Task) => boolean
}

export function KanbanColumn({ status, tasks, onTaskClick, canMoveTask }: KanbanColumnProps) {
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
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/60">
        <span className={cn('rounded-md border px-2 py-0.5 text-xs font-semibold', meta.color)}>
          {meta.label}
        </span>
        <span className="text-xs font-medium text-muted-foreground bg-card rounded-full h-6 min-w-6 px-1.5 flex items-center justify-center border border-border">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="kanban-column-scroll scrollbar-thin flex flex-col gap-2.5 p-2.5 min-h-[160px]"
      >
        <SortableContext id={status} items={itemIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              dragDisabled={canMoveTask ? !canMoveTask(task) : false}
            />
          ))}
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
