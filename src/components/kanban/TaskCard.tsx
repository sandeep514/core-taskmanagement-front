import { forwardRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Briefcase, Calendar, Clock, MessageSquare, Paperclip } from 'lucide-react'
import type { Task } from '@/types'
import { TASK_PRIORITIES, TASK_TYPES } from '@/types'
import { cn, formatDate, formatTaskAssignees, initials, isClientAssignedTask, isOverdue } from '@/lib/utils'
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
    const clientAssigned = isClientAssignedTask(task)

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
          clientAssigned && !overdue && 'border-l-4 border-l-violet-500',
          clientAssigned && 'bg-violet-50/80 border-violet-200 ring-1 ring-violet-100',
          className,
        )}
        {...props}
      >
        <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {clientAssigned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
              <Briefcase className="h-3 w-3" />
              Client
            </span>
          )}
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
          {task.estimate_hours != null && task.estimate_hours !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              <Clock className="h-3 w-3" />
              {task.estimate_hours}h
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {(task.assignees && task.assignees.length > 0) ||
            task.assignee ||
            task.client_assignee ? (
              <>
                <div className="flex -space-x-1.5 shrink-0">
                  {task.client_assignee ? (
                    <Avatar className="h-6 w-6 ring-2 ring-card">
                      <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700">
                        {initials(task.client_assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    (task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [])
                      .slice(0, 3)
                      .map((person) => (
                        <Avatar key={person.id} className="h-6 w-6 ring-2 ring-card">
                          <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700">
                            {initials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[110px]">
                  {formatTaskAssignees(task)}
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
