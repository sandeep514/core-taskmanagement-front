import { forwardRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, MessageSquare, Paperclip } from 'lucide-react'
import type { Task } from '@/types'
import { TASK_PRIORITIES, TASK_TYPES } from '@/types'
import { cn, formatDate, initials, isOverdue } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface TaskCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  task: Task
  isDragging?: boolean
  isOverlay?: boolean
}

/** Presentational card — safe for DragOverlay (no useSortable). */
export const TaskCardContent = forwardRef<HTMLDivElement, TaskCardContentProps>(
  function TaskCardContent({ task, className, isDragging, isOverlay, style, ...props }, ref) {
    const priority = TASK_PRIORITIES.find((p) => p.value === task.priority)
    const taskType = TASK_TYPES.find((t) => t.value === (task.task_type ?? 'general'))
    const overdue = isOverdue(task.deadline, task.status)

    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          'rounded-xl border border-border bg-card p-3 shadow-sm select-none touch-none',
          isDragging && !isOverlay && 'opacity-30',
          isOverlay && 'shadow-xl ring-2 ring-primary/20 rotate-1 cursor-grabbing',
          !isOverlay && !isDragging && 'hover:shadow-md cursor-grab active:cursor-grabbing',
          overdue && 'border-l-4 border-l-red-500',
          className,
        )}
        {...props}
      >
        <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {taskType && taskType.value !== 'general' && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                taskType.color,
              )}
            >
              {taskType.label}
            </span>
          )}
          {priority && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                priority.color,
              )}
            >
              {priority.label}
            </span>
          )}
          {task.deadline && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                overdue ? 'bg-red-50 text-red-700 font-medium' : 'bg-slate-50 text-slate-600',
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.deadline)}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {task.assignee ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700">
                    {initials(task.assignee.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {task.assignee.name}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {(task.attachments_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px]">
                <Paperclip className="h-3 w-3" />
                {task.attachments_count}
              </span>
            )}
            {(task.comments_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px]">
                <MessageSquare className="h-3 w-3" />
                {task.comments_count}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  },
)

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
      status: task.status,
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TaskCardContent
      ref={setNodeRef}
      task={task}
      style={style}
      isDragging={isDragging}
      onClick={onClick}
      {...attributes}
      {...listeners}
    />
  )
}
